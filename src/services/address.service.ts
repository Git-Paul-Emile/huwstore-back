import { addressRepository } from "../repositories/address.repository.js";
import { AppError } from "../utils/AppError.js";
import type { addressSchema, addressUpdateSchema } from "../validators/address.validator.js";
import type { z } from "zod";

type AddressRow = NonNullable<Awaited<ReturnType<typeof addressRepository.findById>>>;

/** Garde-fou : au-dela, c'est un usage anormal, pas un carnet d'adresses. */
const MAX_ADDRESSES = 10;

const toDto = (address: AddressRow) => ({
  id: address.id,
  label: address.label,
  fullName: address.fullName,
  phone: address.phone,
  line: address.line,
  landmark: address.landmark ?? undefined,
  city: address.city,
  country: address.country,
  isDefault: address.isDefault,
});

/**
 * Toutes les operations passent par le userId du jeton, jamais par un
 * identifiant fourni dans l'URL : un client ne peut pas atteindre le carnet
 * d'adresses d'un autre, meme en devinant un cuid.
 */
async function assertOwned(id: string, userId: string) {
  const address = await addressRepository.findById(id);
  if (!address || address.userId !== userId) throw AppError.notFound("Adresse introuvable.");
  return address;
}

export const addressService = {
  list: async (userId: string) => (await addressRepository.findByUser(userId)).map(toDto),

  async create(userId: string, input: z.infer<typeof addressSchema>) {
    const count = await addressRepository.countByUser(userId);
    if (count >= MAX_ADDRESSES) {
      throw AppError.badRequest(`Vous ne pouvez pas enregistrer plus de ${MAX_ADDRESSES} adresses.`);
    }

    // La toute premiere adresse est forcement l'adresse par defaut.
    const shouldBeDefault = input.isDefault || count === 0;
    const created = await addressRepository.create({
      ...input,
      landmark: input.landmark ?? null,
      isDefault: false,
      user: { connect: { id: userId } },
    });

    if (shouldBeDefault) return toDto(await addressRepository.setDefault(userId, created.id));
    return toDto(created);
  },

  async update(userId: string, id: string, input: z.infer<typeof addressUpdateSchema>) {
    await assertOwned(id, userId);
    const { isDefault, landmark, ...rest } = input;

    const updated = await addressRepository.update(id, {
      ...rest,
      ...(landmark !== undefined ? { landmark: landmark || null } : {}),
    });

    if (isDefault) return toDto(await addressRepository.setDefault(userId, id));
    return toDto(updated);
  },

  async setDefault(userId: string, id: string) {
    await assertOwned(id, userId);
    return toDto(await addressRepository.setDefault(userId, id));
  },

  async remove(userId: string, id: string) {
    const address = await assertOwned(id, userId);
    await addressRepository.remove(id);

    // On ne laisse jamais un carnet sans adresse par defaut.
    if (address.isDefault) {
      const [next] = await addressRepository.findByUser(userId);
      if (next) await addressRepository.setDefault(userId, next.id);
    }
  },
};
