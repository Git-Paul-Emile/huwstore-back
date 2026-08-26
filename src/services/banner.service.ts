import { bannerRepository } from "../repositories/banner.repository.js";
import { AppError } from "../utils/AppError.js";
import { bannerSlotMap, bannerTargetMap } from "../utils/enumMaps.js";
import type { bannerSchema, bannerUpdateSchema } from "../validators/banner.validator.js";
import type { z } from "zod";

const toDto = (banner: NonNullable<Awaited<ReturnType<typeof bannerRepository.findById>>>) => ({
  id: banner.id,
  title: banner.title,
  slot: bannerSlotMap.label(banner.slot),
  target: bannerTargetMap.label(banner.target),
  start: banner.start,
  end: banner.end,
  active: banner.active,
  image: banner.image,
});

export const bannerService = {
  list: async () => (await bannerRepository.findAll()).map(toDto),

  create: async (input: z.infer<typeof bannerSchema>) => {
    const banner = await bannerRepository.create({
      title: input.title,
      slot: bannerSlotMap.fromLabel(input.slot),
      target: bannerTargetMap.fromLabel(input.target),
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
