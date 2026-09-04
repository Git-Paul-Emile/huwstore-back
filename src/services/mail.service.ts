import { getMailer } from "./external/mailer.js";
import { settingService } from "./setting.service.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

/**
 * Contenu des e-mails transactionnels.
 *
 * Ce service RÉDIGE les messages et les confie au port `Mailer`. Il n'est
 * jamais appelé directement depuis un contrôleur : la file de tâches
 * (`queue/index.ts`) l'invoque en arrière-plan, APRÈS la transaction. Une
 * erreur ici remonte donc volontairement - c'est la file qui décide de rejouer
 * ou de mettre en lettre morte.
 *
 * Deux destinataires, deux rôles :
 *  - la boutique reçoit le signal d'action (« un colis à préparer ») ;
 *  - la cliente reçoit la preuve de sa commande, avec le lien vers son reçu et
 *    sa facture dans son espace client.
 */

const ADMIN_EMAIL = env.SHOP_ADMIN_EMAIL;
const SITE_URL = env.SITE_URL.replace(/\/$/, "");

const fcfa = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

/**
 * Échappe le texte saisi par la cliente (nom, adresse, repère, note) avant de
 * l'insérer dans le HTML de l'e-mail (rules/security.md). Sans cela, une note
 * de commande contenant du HTML ou un lien serait rendue telle quelle dans la
 * boîte de la boutique : injection de contenu, hameçonnage.
 */
const esc = (value: string | null | undefined) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

export type OrderMailPayload = {
  id: string;
  client: string;
  phone: string;
  email?: string | null;
  addressLine: string;
  landmark?: string | null;
  city: string;
  country: string;
  deliveryMode: string;
  items: { name: string; color?: string | null; qty: number; price: number }[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  promoCode?: string | null;
  note?: string | null;
};

const layout = (shopName: string, title: string, body: string) => `
<div style="font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
  <p style="letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:#b8935a;margin:0 0 4px">${esc(shopName)}</p>
  <h1 style="font-size:20px;margin:0 0 20px">${title}</h1>
  ${body}
  <p style="margin-top:28px;font-size:12px;color:#8c857a">
    Paiement à la livraison, en espèces. Aucun paiement en ligne ne vous sera demandé.
  </p>
</div>`;

const lineTable = (order: OrderMailPayload) => `
<table style="width:100%;border-collapse:collapse;font-size:14px">
  ${order.items
    .map(
      (item) => `<tr>
    <td style="padding:6px 0;border-bottom:1px solid #eee">${esc(item.name)}${item.color ? ` - ${esc(item.color)}` : ""} × ${item.qty}</td>
    <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${fcfa(item.price * item.qty)}</td>
  </tr>`,
    )
    .join("")}
  <tr><td style="padding:6px 0">Sous-total</td><td style="padding:6px 0;text-align:right">${fcfa(order.subtotal)}</td></tr>
  <tr><td style="padding:2px 0">Livraison</td><td style="padding:2px 0;text-align:right">${order.shippingFee === 0 ? "Offerte" : fcfa(order.shippingFee)}</td></tr>
  ${order.discount > 0 ? `<tr><td style="padding:2px 0">Remise${order.promoCode ? ` (${esc(order.promoCode)})` : ""}</td><td style="padding:2px 0;text-align:right">−${fcfa(order.discount)}</td></tr>` : ""}
  <tr><td style="padding:10px 0;font-weight:bold;border-top:1px solid #ddd">Total à régler</td><td style="padding:10px 0;text-align:right;font-weight:bold;border-top:1px solid #ddd">${fcfa(order.total)}</td></tr>
</table>`;

const deliveryBlock = (order: OrderMailPayload) => `
<p style="font-size:14px;line-height:1.6;margin:0 0 16px">
  <strong>${esc(order.client)}</strong><br>
  ${esc(order.phone)}<br>
  ${esc(order.addressLine)}${order.landmark ? `<br><em>${esc(order.landmark)}</em>` : ""}<br>
  ${esc(order.city)}, ${esc(order.country)} - ${esc(order.deliveryMode)}
</p>`;

/** Lien vers le reçu, dans l'espace client (accès réservé au compte). */
const receiptUrl = (order: OrderMailPayload) =>
  SITE_URL ? `${SITE_URL}/commande/${order.id}` : null;

async function send(to: string, subject: string, html: string) {
  const mailer = await getMailer();
  await mailer.send({ to, subject, html });
  logger.info({ subject, to, mailer: mailer.name }, "E-mail envoyé");
}

export const mailService = {
  /** Notification a la boutique. C'est le signal d'action pour preparer le colis. */
  async notifyNewOrder(order: OrderMailPayload) {
    if (!ADMIN_EMAIL) {
      logger.warn({ orderId: order.id }, "SHOP_ADMIN_EMAIL absente : notification de commande non envoyée");
      return;
    }
    const shop = await settingService.get();
    const link = SITE_URL
      ? `<p style="font-size:13px"><a href="${SITE_URL}/admin/commandes">Ouvrir le back-office</a></p>`
      : "";

    await send(
      ADMIN_EMAIL,
      `Nouvelle commande ${order.id} - ${fcfa(order.total)}`,
      layout(
        shop.shopName,
        "Nouvelle commande à préparer",
        `${deliveryBlock(order)}${lineTable(order)}${
          order.note
            ? `<p style="font-size:13px;margin-top:16px"><strong>Note de la cliente :</strong> ${esc(order.note)}</p>`
            : ""
        }${link}`,
      ),
    );
  },

  /** Confirmation a la cliente. Envoyee seulement si elle a laisse une adresse. */
  async confirmToClient(order: OrderMailPayload) {
    if (!order.email) return;
    const shop = await settingService.get();
    const url = receiptUrl(order);

    const follow = url
      ? `<p style="font-size:14px;line-height:1.6;margin-top:20px">
           <a href="${url}" style="color:#b8935a">Suivre ma commande et télécharger ma facture</a><br>
           <span style="font-size:12px;color:#8c857a">Connectez-vous pour retrouver cette commande dans votre espace client.</span>
         </p>`
      : "";

    await send(
      order.email,
      `Votre commande ${order.id} est bien enregistrée`,
      layout(
        shop.shopName,
        `Merci ${esc(order.client.split(" ")[0])}, votre commande est enregistrée`,
        `<p style="font-size:14px;line-height:1.6">Nous préparons votre colis. Vous réglerez <strong>${fcfa(order.total)}</strong> en espèces au moment de la livraison.</p>
         ${deliveryBlock(order)}${lineTable(order)}${follow}`,
      ),
    );
  },
};
