import type { Prisma } from "@prisma/client";
import { bannerRepository, type BannerWithLink } from "../repositories/banner.repository.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { AppError } from "../utils/AppError.js";
import { bannerLinkTypeMap, bannerSlotMap, bannerTargetMap } from "../utils/enumMaps.js";
import type { bannerSchema, bannerUpdateSchema, bannerListQuerySchema } from "../validators/banner.validator.js";
import type { z } from "zod";

/**
 * URL finale du bouton, deduite de la destination choisie.
 *
 * Une categorie ou un produit supprime depuis (linkCategoryId / linkProductId
 * repasse a null via onDelete: SetNull) retombe sur /boutique plutot que sur
 * une page morte : la campagne reste cliquable en attendant une correction.
 */
function resolveCtaHref(banner: BannerWithLink): string | undefined {
  switch (banner.linkType) {
    case "CATEGORY":
      return banner.linkCategory ? `/boutique/${encodeURIComponent(banner.linkCategory.name)}` : "/boutique";
    case "PRODUCT":
      return banner.linkProduct ? `/produit/${banner.linkProduct.id}` : "/boutique";
    default:
      return banner.ctaHref ?? undefined;
  }
}

const toDto = (banner: BannerWithLink) => ({
  id: banner.id,
  title: banner.title,
  subtitle: banner.subtitle ?? undefined,
  text: banner.text ?? undefined,
  ctaLabel: banner.ctaLabel ?? undefined,
  linkType: bannerLinkTypeMap.label(banner.linkType),
  linkCategoryId: banner.linkCategoryId ?? undefined,
  linkProductId: banner.linkProductId ?? undefined,
  ctaHref: resolveCtaHref(banner),
  slot: bannerSlotMap.label(banner.slot),
  target: bannerTargetMap.label(banner.target),
  position: banner.position,
  start: banner.start,
  end: banner.end,
  active: banner.active,
  image: banner.image,
});

export type BannerDto = ReturnType<typeof toDto>;

/** Libelles d'emplacement tels qu'ils circulent dans l'API (cote base : l'enum BannerSlot). */
type SlotLabel = Parameters<typeof bannerSlotMap.fromLabel>[0];
type LinkLabel = Parameters<typeof bannerLinkTypeMap.fromLabel>[0];

/**
 * Le bandeau promo de la page d'accueil fait defiler les campagnes actives.
 * On en plafonne le nombre simultane a trois : au dela, le visiteur ne voit
 * plus passer chaque message assez longtemps pour le lire.
 */
const MAX_CONCURRENT_BY_SLOT: Partial<Record<SlotLabel, number>> = { "Bandeau promo": 3 };

async function assertSlotCapacity(slot: SlotLabel, active: boolean, start: Date, end: Date, excludeId?: string) {
  const max = MAX_CONCURRENT_BY_SLOT[slot];
  if (max === undefined || !active) return;

  const overlapping = await bannerRepository.countOverlappingInSlot(
    bannerSlotMap.fromLabel(slot),
    start,
    end,
    excludeId,
  );
  if (overlapping >= max) {
    throw AppError.badRequest(
      `${max} campagnes « ${slot} » sont déjà programmées sur cette période, c'est le maximum. Désactivez-en une ou changez les dates avant d'en ajouter une nouvelle.`,
    );
  }
}

type LinkInput = {
  linkType: LinkLabel;
  ctaHref?: string | null;
  linkCategoryId?: string | null;
  linkProductId?: string | null;
};

type LinkColumns = {
  linkType: "PATH" | "CATEGORY" | "PRODUCT";
  ctaHref: string | null;
  linkCategoryId: string | null;
  linkProductId: string | null;
};

/**
 * Traduit la destination saisie en colonnes de la table Banner : une seule des
 * trois pistes (chemin, categorie, produit) est retenue, les autres sont
 * remises a null. L'existence de la cible est verifiee ici pour renvoyer un 400
 * lisible plutot qu'une erreur de contrainte.
 */
async function resolveLinkColumns(link: LinkInput): Promise<LinkColumns> {
  const linkType = bannerLinkTypeMap.fromLabel(link.linkType);

  if (linkType === "CATEGORY") {
    if (!link.linkCategoryId) throw AppError.badRequest("Choisissez la catégorie vers laquelle mène le bouton.");
    if (!(await categoryRepository.existsById(link.linkCategoryId))) throw AppError.badRequest("Catégorie introuvable.");
    return { linkType, ctaHref: null, linkCategoryId: link.linkCategoryId, linkProductId: null };
  }

  if (linkType === "PRODUCT") {
    if (!link.linkProductId) throw AppError.badRequest("Choisissez le produit vers lequel mène le bouton.");
    if (!(await productRepository.existsById(link.linkProductId))) throw AppError.badRequest("Produit introuvable.");
    return { linkType, ctaHref: null, linkCategoryId: null, linkProductId: link.linkProductId };
  }

  const href = link.ctaHref?.trim();
  if (!href) throw AppError.badRequest("Indiquez la page vers laquelle mène le bouton, ex. /boutique.");
  if (!href.startsWith("/")) throw AppError.badRequest("Le lien doit être une page du site, ex. /boutique.");
  return { linkType, ctaHref: href, linkCategoryId: null, linkProductId: null };
}

/** Champs relationnels a passer a Prisma pour rattacher (ou detacher) les cibles. */
function linkRelations(columns: LinkColumns): Prisma.BannerUpdateInput {
  return {
    linkType: columns.linkType,
    ctaHref: columns.ctaHref,
    linkCategory: columns.linkCategoryId ? { connect: { id: columns.linkCategoryId } } : { disconnect: true },
    linkProduct: columns.linkProductId ? { connect: { id: columns.linkProductId } } : { disconnect: true },
  };
}

/**
 * Bannieres editoriales.
 *
 * C'est ce module qui alimente le bandeau promo de la page d'accueil : les
 * visuels et les textes des campagnes ne vivent PAS dans le code du front. La
 * boutique change sa vitrine depuis le back-office, sans redeploiement.
 */
export const bannerService = {
  /**
   * Par defaut, la vitrine ne recoit que les bannieres reellement diffusables :
   * actives ET dans leur fenetre de dates. Le back-office, lui, demande `all`
   * pour voir aussi les campagnes passees et les brouillons desactives.
   */
  async list(query: z.infer<typeof bannerListQuerySchema> = {}) {
    const where: Prisma.BannerWhereInput = {};
    if (query.slot) where.slot = bannerSlotMap.fromLabel(query.slot);
    if (!query.all) {
      const now = new Date();
      where.active = true;
      where.start = { lte: now };
      where.end = { gte: now };
    }
    return (await bannerRepository.findAll(where)).map(toDto);
  },

  create: async (input: z.infer<typeof bannerSchema>) => {
    await assertSlotCapacity(input.slot, input.active, input.start, input.end);
    const link = await resolveLinkColumns(input);

    const banner = await bannerRepository.create({
      title: input.title,
      subtitle: input.subtitle,
      text: input.text,
      ctaLabel: input.ctaLabel,
      linkType: link.linkType,
      ctaHref: link.ctaHref,
      linkCategory: link.linkCategoryId ? { connect: { id: link.linkCategoryId } } : undefined,
      linkProduct: link.linkProductId ? { connect: { id: link.linkProductId } } : undefined,
      slot: bannerSlotMap.fromLabel(input.slot),
      target: bannerTargetMap.fromLabel(input.target),
      position: input.position,
      start: input.start,
      end: input.end,
      active: input.active,
      image: input.image,
    });
    return toDto(banner);
  },

  async update(id: string, input: z.infer<typeof bannerUpdateSchema>) {
    const existing = await bannerRepository.findById(id);
    if (!existing) throw AppError.notFound("Bannière introuvable.");

    const { slot, target, linkType, linkCategoryId, linkProductId, ctaHref, ...rest } = input;
    const start = rest.start ?? existing.start;
    const end = rest.end ?? existing.end;
    if (end <= start) throw AppError.badRequest("La date de fin doit être postérieure à la date de début.");

    const resolvedSlot = slot ?? bannerSlotMap.label(existing.slot);
    const resolvedActive = rest.active ?? existing.active;
    await assertSlotCapacity(resolvedSlot, resolvedActive, start, end, id);

    // On ne recalcule la destination que si l'un de ses champs est fourni ;
    // sinon la campagne garde son lien tel quel.
    const linkTouched =
      linkType !== undefined || linkCategoryId !== undefined || linkProductId !== undefined || ctaHref !== undefined;
    const linkData = linkTouched
      ? await resolveLinkColumns({
          linkType: linkType ?? bannerLinkTypeMap.label(existing.linkType),
          ctaHref: ctaHref !== undefined ? ctaHref : existing.ctaHref,
          linkCategoryId: linkCategoryId !== undefined ? linkCategoryId : existing.linkCategoryId,
          linkProductId: linkProductId !== undefined ? linkProductId : existing.linkProductId,
        })
      : null;

    const banner = await bannerRepository.update(id, {
      ...rest,
      ...(slot ? { slot: bannerSlotMap.fromLabel(slot) } : {}),
      ...(target ? { target: bannerTargetMap.fromLabel(target) } : {}),
      ...(linkData ? linkRelations(linkData) : {}),
    });
    return toDto(banner);
  },

  async remove(id: string) {
    const existing = await bannerRepository.findById(id);
    if (!existing) throw AppError.notFound("Bannière introuvable.");
    await bannerRepository.remove(id);
  },
};
