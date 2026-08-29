import { createPdfDocument, type PdfColor } from "../utils/pdf.js";
import type { OrderDto } from "./order.service.js";
import type { SettingDto } from "./setting.service.js";

/**
 * Facture PDF (recueil de besoins : « le site doit générer automatiquement une
 * facture pour le client » = Oui).
 *
 * Deux principes tenus ici :
 *  1. La facture ne recalcule RIEN. Elle imprime les montants figés dans la
 *     commande. Une hausse de tarif ou un changement de frais de port ne doit
 *     pas modifier une facture déjà émise.
 *  2. Elle dit la vérité fiscale. Tant que la boutique n'a pas de NINEA, la
 *     mention « TVA non applicable » est imprimée ; dès que le numéro est
 *     renseigné dans les paramètres, il apparaît sur le document.
 */

const GOLD: PdfColor = [0.72, 0.66, 0.45];
const INK: PdfColor = [0.06, 0.06, 0.06];
const GREY: PdfColor = [0.45, 0.43, 0.4];
const LIGHT: PdfColor = [0.95, 0.94, 0.91];

const MARGIN = 48;

const fcfa = (amount: number) =>
  // toLocaleString sépare les milliers par une espace insécable étroite, que
  // l'encodage WinAnsi du PDF ne connaît pas : on la remplace par une espace
  // ordinaire, sinon le montant s'affiche avec un caractère parasite.
  `${amount.toLocaleString("fr-FR").replace(/[\u202F\u00A0\u2009]/g, " ")} FCFA`;

const frenchDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/** Numéro lisible par un humain : les 8 derniers caractères suffisent. */
export const invoiceNumber = (orderId: string) => `FA-${orderId.slice(-8).toUpperCase()}`;

export const invoiceService = {
  /** Nom du fichier proposé au téléchargement. */
  fileName: (order: OrderDto) => `${invoiceNumber(order.id)}.pdf`,

  build(order: OrderDto, shop: SettingDto): Buffer {
    const doc = createPdfDocument();
    const contentWidth = doc.width - MARGIN * 2;
    const right = (x: number) => doc.width - MARGIN - x;

    // ---- En-tête -----------------------------------------------------------
    doc.rect(0, 0, doc.width, 4, GOLD);
    doc.text(shop.shopName.toUpperCase(), MARGIN, 70, { size: 18, font: "bold", color: INK });
    doc.text("Maroquinerie", MARGIN, 86, { size: 8.5, color: GOLD });

    doc.text("FACTURE", MARGIN, 70, { size: 18, font: "bold", color: INK, align: "right", width: contentWidth });
    doc.text(invoiceNumber(order.id), MARGIN, 86, { size: 9, color: GREY, align: "right", width: contentWidth });
    doc.text(frenchDate(order.date), MARGIN, 100, { size: 9, color: GREY, align: "right", width: contentWidth });

    doc.line(MARGIN, 118, contentWidth);

    // ---- Émetteur / destinataire ------------------------------------------
    const columnWidth = contentWidth / 2 - 12;
    let leftY = 142;
    doc.text("ÉMETTEUR", MARGIN, leftY, { size: 7.5, color: GOLD, font: "bold" });
    leftY += 16;
    doc.text(shop.shopName, MARGIN, leftY, { size: 10, font: "bold" });
    leftY += 14;
    for (const line of [
      shop.addressLine,
      `${shop.city}, ${shop.country}`,
      `Tél. ${shop.phone}`,
      shop.email,
      shop.ninea ? `NINEA ${shop.ninea}` : undefined,
    ].filter(Boolean) as string[]) {
      doc.text(line, MARGIN, leftY, { size: 9, color: GREY });
      leftY += 13;
    }

    const clientX = MARGIN + contentWidth / 2 + 12;
    let clientY = 142;
    doc.text("FACTURÉ À", clientX, clientY, { size: 7.5, color: GOLD, font: "bold" });
    clientY += 16;
    doc.text(order.client, clientX, clientY, { size: 10, font: "bold" });
    clientY += 14;
    for (const line of [
      order.phone,
      order.email,
      order.addressLine,
      order.landmark,
      `${order.city}, ${order.country}`,
      `Livraison : ${order.deliveryMode}`,
    ].filter(Boolean) as string[]) {
      clientY = doc.paragraph(line, clientX, clientY, columnWidth, { size: 9, color: GREY });
    }

    // ---- Lignes de commande ------------------------------------------------
    let y = Math.max(leftY, clientY) + 24;

    const columns = { article: MARGIN + 10, qty: MARGIN + 300, unit: MARGIN + 350, total: MARGIN + 430 };
    doc.rect(MARGIN, y - 12, contentWidth, 24, LIGHT);
    doc.text("DÉSIGNATION", columns.article, y + 4, { size: 7.5, font: "bold", color: GREY });
    doc.text("QTÉ", columns.qty, y + 4, { size: 7.5, font: "bold", color: GREY, align: "right", width: 30 });
    doc.text("PRIX UNITAIRE", columns.unit, y + 4, { size: 7.5, font: "bold", color: GREY, align: "right", width: 70 });
    doc.text("TOTAL", columns.total, y + 4, { size: 7.5, font: "bold", color: GREY, align: "right", width: right(columns.total) });
    y += 32;

    for (const item of order.items) {
      const label = item.color ? `${item.name} - ${item.color}` : item.name;
      doc.text(label, columns.article, y, { size: 9.5 });
      doc.text(String(item.qty), columns.qty, y, { size: 9.5, align: "right", width: 30 });
      doc.text(fcfa(item.price), columns.unit, y, { size: 9.5, align: "right", width: 70 });
      doc.text(fcfa(item.price * item.qty), columns.total, y, { size: 9.5, align: "right", width: right(columns.total) });
      y += 12;
      doc.line(MARGIN, y, contentWidth);
      y += 14;
    }

    // ---- Totaux ------------------------------------------------------------
    y += 6;
    const totalsX = MARGIN + contentWidth / 2;
    const totalsWidth = contentWidth / 2;

    const totalLine = (label: string, value: string, bold = false) => {
      doc.text(label, totalsX, y, { size: bold ? 11 : 9.5, font: bold ? "bold" : "regular", color: bold ? INK : GREY });
      doc.text(value, totalsX, y, {
        size: bold ? 11 : 9.5,
        font: bold ? "bold" : "regular",
        align: "right",
        width: totalsWidth,
      });
      y += bold ? 20 : 16;
    };

    totalLine("Sous-total", fcfa(order.subtotal));
    totalLine("Livraison", order.shippingFee === 0 ? "Offerte" : fcfa(order.shippingFee));
    if (order.discount > 0) {
      totalLine(order.promoCode ? `Remise (${order.promoCode})` : "Remise", `- ${fcfa(order.discount)}`);
    }
    doc.line(totalsX, y - 4, totalsWidth);
    y += 12;
    totalLine("TOTAL À RÉGLER", fcfa(order.total), true);

    // ---- Mentions ----------------------------------------------------------
    y += 16;
    doc.rect(MARGIN, y, contentWidth, 52, LIGHT);
    doc.text("Règlement", MARGIN + 14, y + 20, { size: 8, font: "bold", color: GOLD });
    doc.text(
      `${order.method} - statut : ${order.pay.toLowerCase()}.`,
      MARGIN + 14,
      y + 36,
      { size: 9.5, color: INK },
    );
    y += 72;

    doc.text(
      shop.ninea ? `NINEA ${shop.ninea}` : "TVA non applicable.",
      MARGIN,
      y,
      { size: 8.5, color: GREY },
    );
    y += 14;
    doc.paragraph(
      "Aucun paiement en ligne n'est demandé : le règlement se fait en espèces à la remise du colis. " +
        "Les articles ne sont ni repris ni échangés.",
      MARGIN,
      y,
      contentWidth,
      { size: 8.5, color: GREY },
    );

    // ---- Pied de page ------------------------------------------------------
    doc.line(MARGIN, doc.height - 74, contentWidth);
    doc.text(`${shop.shopName} - ${shop.city}, ${shop.country} - ${shop.phone}`, MARGIN, doc.height - 56, {
      size: 8,
      color: GREY,
      align: "center",
      width: contentWidth,
    });
    doc.text("Merci pour votre confiance.", MARGIN, doc.height - 42, {
      size: 8,
      color: GOLD,
      align: "center",
      width: contentWidth,
    });

    return doc.build();
  },
};
