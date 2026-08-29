import type { Prisma } from "@prisma/client";
import { bannerRepository } from "../repositories/banner.repository.js";
import { AppError } from "../utils/AppError.js";
import { bannerSlotMap, bannerTargetMap } from "../utils/enumMaps.js";
import type { bannerSchema, bannerUpdateSchema, bannerListQuerySchema } from "../validators/banner.validator.js";
import type { z } from "zod";

const toDto = (banner: NonNullable<Awaited<ReturnType<typeof bannerRepository.findById>>>) => ({
  id: banner.id,
  title: banner.title,
  subtitle: banner.subtitle ?? undefined,
  text: banner.text ?? undefined,
  ctaLabel: banner.ctaLabel ?? undefined,
  ctaHref: banner.ctaHref ?? undefined,
  slot: bannerSlotMap.label(banner.slot),
  target: bannerTargetMap.label(banner.target),
  focus: banner.focus,
  position: banner.position,
  start: banner.start,
  end: banner.end,
  active: banner.active,
  image: banner.image,
});

export type BannerDto = ReturnType<typeof toDto>;

/**
 * Le premier slide du carrousel est fixe et vit dans le code du front : il ne
 * compte jamais dans cette limite. Au-dela, deux campagnes Hero en meme temps
 * suffisent - une troisieme rendrait le carrousel illisible sur un ecran de
 * telephone.
 */
const MAX_CONCURRENT_HERO_CAMPAIGNS = 2;

async function assertHeroCapacity(slot: string, active: boolean, start: Date, end: Date, excludeId?: string) {
  if (slot !== "Hero" || !active) return;
  const overlapping = await bannerRepository.countOverlappingHero(start, end, excludeId);
  if (overlapping >= MAX_CONCURRENT_HERO_CAMPAIGNS) {
    throw AppError.badRequest(
      "Deux bannières Hero sont déjà programmées sur cette période. Désactivez-en une ou changez les dates avant d'en ajouter une nouvelle.",
    );
  }
}

/**
 * Bannieres editoriales.
 *
 * C'est ce module qui alimente le carrousel de la page d'accueil : les visuels
 * et les textes ne vivent PAS dans le code du front. La boutique change sa
 * vitrine depuis le back-office, sans redeploiement.
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
    await assertHeroCapacity(input.slot, input.active, input.start, input.end);

    const banner = await bannerRepository.create({
      title: input.title,
      subtitle: input.subtitle,
      text: input.text,
      ctaLabel: input.ctaLabel,
      ctaHref: input.ctaHref,
      slot: bannerSlotMap.fromLabel(input.slot),
      target: bannerTargetMap.fromLabel(input.target),
      focus: input.focus,
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

    const { slot, target, ...rest } = input;
    const start = rest.start ?? existing.start;
    const end = rest.end ?? existing.end;
    if (end <= start) throw AppError.badRequest("La date de fin doit être postérieure à la date de début.");

    const resolvedSlot = slot ?? bannerSlotMap.label(existing.slot);
    const resolvedActive = rest.active ?? existing.active;
    await assertHeroCapacity(resolvedSlot, resolvedActive, start, end, id);

    const banner = await bannerRepository.update(id, {
      ...rest,
      ...(slot ? { slot: bannerSlotMap.fromLabel(slot) } : {}),
      ...(target ? { target: bannerTargetMap.fromLabel(target) } : {}),
    });
    return toDto(banner);
  },

  async remove(id: string) {
    const existing = await bannerRepository.findById(id);
    if (!existing) throw AppError.notFound("Bannière introuvable.");
    await bannerRepository.remove(id);
  },
};
