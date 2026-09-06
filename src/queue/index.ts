/**
 * File de tâches de l'application.
 *
 * Un seul point d'enregistrement des jobs, importé par les services qui
 * empilent du travail et par la sonde de santé qui lit `jobQueue.stats()`.
 */
import { JobQueue } from "./job-queue.js";
import { mailService, type OrderMailPayload } from "../services/mail.service.js";
import { mediaService } from "../services/media.service.js";

export const JOBS = {
  orderNotifyShop: "order.notify-shop",
  orderConfirmClient: "order.confirm-client",
  mediaCleanup: "media.cleanup",
} as const;

type MediaCleanupPayload = { url: string; kind: "image" | "video" };

export const jobQueue = new JobQueue({ concurrency: 2 });

jobQueue.register<OrderMailPayload>(JOBS.orderNotifyShop, (payload) => mailService.notifyNewOrder(payload));
jobQueue.register<OrderMailPayload>(JOBS.orderConfirmClient, (payload) => mailService.confirmToClient(payload));
jobQueue.register<MediaCleanupPayload>(JOBS.mediaCleanup, (payload) => mediaService.remove(payload));

/**
 * Empile la suppression de médias devenus orphelins. Une clé d'idempotence par
 * URL : rejouer ou empiler deux fois la même suppression est sans effet.
 * Les entrées vides sont ignorées (champ image ou vidéo facultatif non rempli).
 */
export function enqueueMediaCleanup(assets: { url?: string | null; kind?: "image" | "video" }[]): void {
  for (const asset of assets) {
    if (!asset.url) continue;
    jobQueue.enqueue(
      JOBS.mediaCleanup,
      { url: asset.url, kind: asset.kind ?? "image" },
      { idempotencyKey: `media-cleanup:${asset.url}` },
    );
  }
}
