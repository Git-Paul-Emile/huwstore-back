/**
 * File de tâches de l'application.
 *
 * Un seul point d'enregistrement des jobs, importé par les services qui
 * empilent du travail et par la sonde de santé qui lit `jobQueue.stats()`.
 */
import { JobQueue } from "./job-queue.js";
import { mailService, type OrderMailPayload } from "../services/mail.service.js";

export const JOBS = {
  orderNotifyShop: "order.notify-shop",
  orderConfirmClient: "order.confirm-client",
} as const;

export const jobQueue = new JobQueue({ concurrency: 2 });

jobQueue.register<OrderMailPayload>(JOBS.orderNotifyShop, (payload) => mailService.notifyNewOrder(payload));
jobQueue.register<OrderMailPayload>(JOBS.orderConfirmClient, (payload) => mailService.confirmToClient(payload));
