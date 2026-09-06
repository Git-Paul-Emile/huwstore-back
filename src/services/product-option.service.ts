import type { ProductOption } from "@prisma/client";
import { productOptionRepository } from "../repositories/product-option.repository.js";
import { AppError } from "../utils/AppError.js";
import { productOptionKindMap } from "../utils/enumMaps.js";
import type {
  productOptionSchema,
  productOptionUpdateSchema,
  productOptionListQuerySchema,
  ProductOptionKindLabel,
} from "../validators/product-option.validator.js";
import type { z } from "zod";

/**
 * Listes de valeurs proposées à la saisie d'un produit : matière et type de
 * fermeture. La fiche produit garde la valeur en texte (`Product.material` /
 * `Product.closure`) - retirer ou renommer une option ne réécrit jamais les
 * fiches existantes.
 */

type ProductOptionDto = { id: string; kind: ProductOptionKindLabel; label: string; position: number };

const toDto = (option: ProductOption): ProductOptionDto => ({
  id: option.id,
  kind: productOptionKindMap.label(option.kind) as ProductOptionKindLabel,
  label: option.label,
  position: option.position,
});

export const productOptionService = {
  /**
   * Renvoie les deux listes, groupées : le formulaire produit remplit ses deux
   * champs `select` en une seule requête, l'écran de gestion lit les objets
   * complets (id, position).
   */
  async list(query: z.infer<typeof productOptionListQuerySchema>) {
    const kind = query.kind ? productOptionKindMap.fromLabel(query.kind) : undefined;
    const rows = (await productOptionRepository.findAll(kind)).map(toDto);
    return {
      matiere: rows.filter((row) => row.kind === "matiere"),
      fermeture: rows.filter((row) => row.kind === "fermeture"),
    };
  },

  async create(input: z.infer<typeof productOptionSchema>) {
    const kind = productOptionKindMap.fromLabel(input.kind);
    const existing = await productOptionRepository.findByKindAndLabel(kind, input.label);
    if (existing) throw AppError.conflict("Cette valeur existe déjà dans la liste.");

    return toDto(
      await productOptionRepository.create({ kind, label: input.label, position: input.position }),
    );
  },

  async update(id: string, input: z.infer<typeof productOptionUpdateSchema>) {
    const existing = await productOptionRepository.findById(id);
    if (!existing) throw AppError.notFound("Valeur introuvable.");

    if (input.label && input.label !== existing.label) {
      const clash = await productOptionRepository.findByKindAndLabel(existing.kind, input.label);
      if (clash) throw AppError.conflict("Cette valeur existe déjà dans la liste.");
    }

    return toDto(await productOptionRepository.update(id, input));
  },

  async remove(id: string) {
    const existing = await productOptionRepository.findById(id);
    if (!existing) throw AppError.notFound("Valeur introuvable.");
    // Suppression franche : aucune fiche n'y renvoie par clé, seulement par
    // texte. Les produits déjà saisis avec cette valeur la gardent.
    await productOptionRepository.remove(id);
  },
};
