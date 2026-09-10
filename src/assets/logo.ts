/**
 * Logo de la boutique pour l'en-tête du reçu PDF.
 *
 * Contenu : les octets d'un fichier JPEG, encodés en base64. Vide par défaut :
 * tant que rien n'est fourni, le reçu garde son en-tête typographique (nom de
 * la boutique en capitales). Le générateur PDF fait maison n'embarque que du
 * JPEG (filtre PDF natif DCTDecode) : ni PNG, ni SVG.
 *
 * Pour installer le logo, depuis `back/` :
 *   node -e "process.stdout.write(require('fs').readFileSync(process.argv[1],'base64'))" chemin/vers/logo.jpg
 * puis coller la chaîne obtenue comme valeur de RECEIPT_LOGO_JPEG_BASE64.
 * Un fond blanc et une largeur de 600 px environ suffisent.
 */
export const RECEIPT_LOGO_JPEG_BASE64 = "";

/** Buffer du logo, ou null si aucun logo n'est configuré. */
export const receiptLogo = (): Buffer | null =>
  RECEIPT_LOGO_JPEG_BASE64 ? Buffer.from(RECEIPT_LOGO_JPEG_BASE64, "base64") : null;
