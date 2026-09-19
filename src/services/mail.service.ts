import { getMailer, type MailMessage } from "./external/mailer.js";
import { settingService, type SettingDto } from "./setting.service.js";
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
  items: { name: string; color?: string | null; qty: number; price: number; image?: string | null }[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  promoCode?: string | null;
  note?: string | null;
  /** Espèces, Wave ou Orange Money - détermine le paragraphe de paiement de l'e-mail client. */
  method: string;
  /** Espèces à la remise possible sur la zone de cette commande, figé à l'achat (voir `DeliveryZone.codEligible`). */
  codEligible: boolean;
};

// Pas de rappel générique des modalités de paiement ici : `confirmToClient`
// écrit un paragraphe précis, propre au moyen réellement choisi pour CETTE
// commande - un rappel générique en pied de page serait soit redondant, soit
// faux pour la commande en question.
const layout = (shopName: string, title: string, body: string) => `
<div style="font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
  <p style="letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:#b8935a;margin:0 0 4px">${esc(shopName)}</p>
  <h1 style="font-size:20px;margin:0 0 20px">${title}</h1>
  ${body}
</div>`;

const itemCell = (item: OrderMailPayload["items"][number]) => {
  const label = `${esc(item.name)}${item.color ? ` - ${esc(item.color)}` : ""} × ${item.qty}`;
  if (!item.image) return label;
  // Vignette : table interne pour l'alignement, seule mise en page fiable en
  // e-mail. Dimensions en attributs, exigées par plusieurs clients.
  return `<table role="presentation" style="border-collapse:collapse"><tr>
    <td style="padding-right:10px;width:44px"><img src="${esc(item.image)}" width="44" height="56" alt="" style="display:block;border-radius:3px;object-fit:cover"></td>
    <td style="font-size:14px">${label}</td>
  </tr></table>`;
};

const lineTable = (order: OrderMailPayload) => `
<table style="width:100%;border-collapse:collapse;font-size:14px">
  ${order.items
    .map(
      (item) => `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #eee">${itemCell(item)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${fcfa(item.price * item.qty)}</td>
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

/**
 * Versions texte brut des mêmes blocs. Pas d'échappement : le corps est envoyé
 * en text/plain, il n'y a pas de HTML à injecter. Un e-mail sans partie texte
 * est pénalisé par les filtres anti-spam et illisible pour les clients en mode
 * texte, on en fournit donc toujours une.
 */
const addressText = (order: OrderMailPayload) =>
  [order.client, order.phone, order.addressLine, order.landmark, `${order.city}, ${order.country} - ${order.deliveryMode}`]
    .filter(Boolean)
    .join("\n");

const linesText = (order: OrderMailPayload) =>
  [
    ...order.items.map(
      (item) => `- ${item.name}${item.color ? ` (${item.color})` : ""} x${item.qty}  ${fcfa(item.price * item.qty)}`,
    ),
    `Sous-total : ${fcfa(order.subtotal)}`,
    `Livraison : ${order.shippingFee === 0 ? "Offerte" : fcfa(order.shippingFee)}`,
    ...(order.discount > 0
      ? [`Remise${order.promoCode ? ` (${order.promoCode})` : ""} : -${fcfa(order.discount)}`]
      : []),
    `Total à régler : ${fcfa(order.total)}`,
  ].join("\n");

/** Lien vers le reçu, dans l'espace client (accès réservé au compte). */
const receiptUrl = (order: OrderMailPayload) =>
  SITE_URL ? `${SITE_URL}/commande/${order.id}` : null;

/** Lien de paiement propre au moyen choisi, absent si la boutique ne l'a pas renseigné. */
const paymentUrl = (method: string, shop: SettingDto) =>
  method === "Wave" ? shop.wavePaymentUrl : method === "Orange Money" ? shop.orangeMoneyUrl : undefined;

/**
 * Paragraphe de paiement, propre au moyen réellement choisi pour CETTE
 * commande.
 *
 * Sur une zone éligible aux espèces, espèces ET mobile money se règlent à la
 * livraison - le lien n'est qu'une commodité pour payer plus tôt. Ailleurs, le
 * mobile money est le seul moyen ouvert et il est payé d'avance, hors du
 * site : celui-ci ne peut jamais vérifier lui-même qu'un virement est arrivé,
 * la boutique confirme donc l'encaissement à la main avant d'expédier (voir
 * `admin/Orders.tsx`, `needsPaymentConfirmation`).
 */
const paymentHtml = (order: OrderMailPayload, shop: SettingDto) => {
  if (order.method === "Espèces") {
    return "Réglez-le en espèces à la remise du colis. Aucun paiement ne se fait sur ce site.";
  }
  if (order.codEligible) {
    return `Vous pouvez payer ${esc(shop.shopName)} dès maintenant par Wave ou Orange Money, ou régler directement à la livraison, en espèces ou par mobile money.`;
  }
  const url = paymentUrl(order.method, shop);
  const link = url ? ` en cliquant sur <a href="${esc(url)}" style="color:#b8935a">ce lien</a>` : "";
  const phone = shop.phone ? ` ou au numéro ${esc(shop.phone)}` : "";
  return `<strong>Paiement par Wave ou Orange Money pour valider la commande et la finaliser.</strong> Payez ${esc(shop.shopName)} avec ${esc(order.method)}${link}${phone}. Nous confirmons dès réception et votre commande part en préparation.`;
};

const paymentText = (order: OrderMailPayload, shop: SettingDto) => {
  if (order.method === "Espèces") {
    return "Réglez-le en espèces à la remise du colis. Aucun paiement ne se fait sur ce site.";
  }
  if (order.codEligible) {
    return `Vous pouvez payer ${shop.shopName} dès maintenant par Wave ou Orange Money, ou régler directement à la livraison, en espèces ou par mobile money.`;
  }
  const url = paymentUrl(order.method, shop);
  const link = url ? ` sur ${url}` : "";
  const phone = shop.phone ? ` ou au numéro ${shop.phone}` : "";
  return `Paiement par Wave ou Orange Money pour valider la commande et la finaliser. Payez ${shop.shopName} avec ${order.method}${link}${phone}. Nous confirmons dès réception et votre commande part en préparation.`;
};

async function send(message: MailMessage) {
  const mailer = await getMailer();
  await mailer.send(message);
  logger.info({ subject: message.subject, to: message.to, mailer: mailer.name }, "E-mail envoyé");
}

export const mailService = {
  /** Notification a la boutique. C'est le signal d'action pour preparer le colis. */
  async notifyNewOrder(order: OrderMailPayload) {
    if (!ADMIN_EMAIL) {
      logger.warn({ orderId: order.id }, "SHOP_ADMIN_EMAIL absente : notification de commande non envoyée");
      return;
    }
    const shop = await settingService.get();

    // Hors zone éligible aux espèces, le mobile money est payé d'avance, hors
    // du site : personne ne peut vérifier automatiquement qu'un virement est
    // arrivé. La boutique doit donc le contrôler elle-même avant de préparer
    // le colis, puis confirmer le paiement dans le back-office - c'est ce clic
    // qui déclenche `mailService.confirmPaymentToClient` (voir
    // `admin/Orders.tsx`, `needsPaymentConfirmation`).
    const needsPaymentConfirmation = order.method !== "Espèces" && !order.codEligible;
    const backOfficeUrl = SITE_URL ? `${SITE_URL}/admin/commandes?search=${encodeURIComponent(order.id)}` : null;
    const paymentNotice = needsPaymentConfirmation
      ? `<p style="font-size:14px;line-height:1.6;color:#8a5a00;background:#fdf3e3;padding:10px 14px;border-radius:4px">
           Paiement par ${esc(order.method)} à vérifier avant préparation. Une fois reçu, confirmez-le dans le
           back-office pour valider la commande.
         </p>`
      : "";
    const link = backOfficeUrl
      ? `<p style="font-size:13px"><a href="${backOfficeUrl}">${
          needsPaymentConfirmation ? "Ouvrir la commande pour confirmer le paiement" : "Ouvrir le back-office"
        }</a></p>`
      : "";

    await send({
      to: ADMIN_EMAIL,
      // Une réponse de la boutique à cette notification doit atteindre la cliente.
      replyTo: order.email ?? undefined,
      subject: `Nouvelle commande ${order.id} - ${fcfa(order.total)}`,
      html: layout(
        shop.shopName,
        "Nouvelle commande à préparer",
        `${paymentNotice}${deliveryBlock(order)}${lineTable(order)}${
          order.note
            ? `<p style="font-size:13px;margin-top:16px"><strong>Note de la cliente :</strong> ${esc(order.note)}</p>`
            : ""
        }${link}`,
      ),
      text: [
        `Nouvelle commande ${order.id} - ${fcfa(order.total)}`,
        "",
        ...(needsPaymentConfirmation
          ? [`Paiement par ${order.method} à vérifier avant préparation. Confirmez-le dans le back-office une fois reçu.`, ""]
          : []),
        addressText(order),
        "",
        linesText(order),
        ...(order.note ? ["", `Note de la cliente : ${order.note}`] : []),
        ...(backOfficeUrl
          ? ["", needsPaymentConfirmation ? `Confirmer le paiement : ${backOfficeUrl}` : `Back-office : ${backOfficeUrl}`]
          : []),
      ].join("\n"),
    });
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

    await send({
      to: order.email,
      // Une réponse de la cliente à sa confirmation doit atteindre la boutique.
      replyTo: ADMIN_EMAIL || undefined,
      subject: `Votre commande ${order.id} est bien enregistrée`,
      html: layout(
        shop.shopName,
        `Merci ${esc(order.client.split(" ")[0])}, votre commande est enregistrée`,
        `<p style="font-size:14px;line-height:1.6">Nous préparons votre colis. Montant : <strong>${fcfa(order.total)}</strong>. ${paymentHtml(order, shop)}</p>
         ${deliveryBlock(order)}${lineTable(order)}${follow}`,
      ),
      text: [
        `Merci ${order.client.split(" ")[0]}, votre commande ${order.id} est enregistrée.`,
        "",
        `Nous préparons votre colis. Montant : ${fcfa(order.total)}.`,
        paymentText(order, shop),
        "",
        addressText(order),
        "",
        linesText(order),
        ...(url ? ["", `Suivre ma commande et télécharger la facture : ${url}`] : []),
      ].join("\n"),
    });
  },

  /**
   * Confirmation du paiement, une fois vérifié à la main par la boutique
   * (mobile money hors zone éligible aux espèces : voir `admin/Orders.tsx`,
   * `needsPaymentConfirmation`). Distincte de `confirmToClient`, qui part à
   * la création de la commande, avant que le paiement soit arrivé.
   */
  async confirmPaymentToClient(order: OrderMailPayload) {
    if (!order.email) return;
    const shop = await settingService.get();
    const url = receiptUrl(order);

    const follow = url
      ? `<p style="font-size:14px;line-height:1.6;margin-top:20px">
           <a href="${url}" style="color:#b8935a">Télécharger ma facture</a><br>
           <span style="font-size:12px;color:#8c857a">Connectez-vous pour retrouver cette commande dans votre espace client.</span>
         </p>`
      : "";

    await send({
      to: order.email,
      replyTo: ADMIN_EMAIL || undefined,
      subject: `Paiement confirmé - commande ${order.id}`,
      html: layout(
        shop.shopName,
        `Merci ${esc(order.client.split(" ")[0])}, votre paiement est confirmé`,
        `<p style="font-size:14px;line-height:1.6">Votre commande est validée et part en préparation. Montant réglé : <strong>${fcfa(order.total)}</strong>.</p>
         ${deliveryBlock(order)}${lineTable(order)}${follow}`,
      ),
      text: [
        `Merci ${order.client.split(" ")[0]}, votre paiement pour la commande ${order.id} est confirmé.`,
        "",
        `Votre commande est validée et part en préparation. Montant réglé : ${fcfa(order.total)}.`,
        "",
        addressText(order),
        "",
        linesText(order),
        ...(url ? ["", `Télécharger ma facture : ${url}`] : []),
      ].join("\n"),
    });
  },
};
