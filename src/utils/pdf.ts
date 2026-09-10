/**
 * Générateur de PDF minimal, sans dépendance.
 *
 * Pourquoi écrire ça plutôt qu'installer une bibliothèque ? Parce que le seul
 * document PDF de la boutique est la facture : une page A4, du texte, des
 * filets et des aplats. Une bibliothèque de mise en page complète (pdfkit et
 * ses ~15 dépendances transitives) coûterait plus cher en surface de
 * maintenance et en audit de sécurité que les 150 lignes ci-dessous.
 *
 * Le format PDF utilisé est volontairement le plus simple qui soit :
 *  - une seule page, deux polices de base (Helvetica, Helvetica-Bold) que TOUS
 *    les lecteurs PDF embarquent : rien à incorporer dans le fichier ;
 *  - encodage WinAnsi, qui couvre les accents du français (é, è, à, ç, ô) ;
 *  - un flux de contenu en clair, non compressé : un fichier de facture pèse
 *    quelques kilo-octets, la compression n'apporterait rien.
 *
 * Si un jour la facture devient un vrai document multi-pages avec images et
 * tableaux dynamiques, c'est CE fichier qu'on remplace par pdfkit - l'API
 * publique (`createPdfDocument`) ne bougerait pas.
 */

const PAGE_WIDTH = 595.28; // A4 en points (72 dpi)
const PAGE_HEIGHT = 841.89;

/**
 * Largeur des caractères, en millièmes de la taille de police, pour les deux
 * polices utilisées. Elles servent à aligner un montant à droite : sans elles,
 * impossible de savoir où commence le texte.
 */
// prettier-ignore
const WIDTHS_REGULAR = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
  1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
  333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
  556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,
];
// prettier-ignore
const WIDTHS_BOLD = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
  975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
  333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
  611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,
];

export type PdfFont = "regular" | "bold";
export type PdfAlign = "left" | "right" | "center";

type JpegMeta = { width: number; height: number; colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK" };

/**
 * Lit la taille et l'espace colorimétrique d'un JPEG dans son en-tête.
 *
 * Le PDF sait décoder le JPEG nativement (filtre `DCTDecode`) : on embarque les
 * octets tels quels, il suffit d'annoncer les bonnes dimensions. On parcourt les
 * segments jusqu'au marqueur SOF (début de trame), seul à porter largeur,
 * hauteur et nombre de composantes.
 */
function readJpegMeta(jpeg: Buffer): JpegMeta {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("Image attendue au format JPEG.");
  let offset = 2;
  while (offset + 9 < jpeg.length) {
    if (jpeg[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = jpeg[offset + 1];
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      const components = jpeg[offset + 9];
      return {
        height: jpeg.readUInt16BE(offset + 5),
        width: jpeg.readUInt16BE(offset + 7),
        colorSpace: components === 1 ? "DeviceGray" : components === 4 ? "DeviceCMYK" : "DeviceRGB",
      };
    }
    // Marqueurs sans charge utile (RSTn, SOI, EOI, TEM) : on avance de 2 octets.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    offset += 2 + jpeg.readUInt16BE(offset + 2);
  }
  throw new Error("En-tête JPEG illisible : marqueur SOF introuvable.");
}

/** Couleur RVB exprimée de 0 à 1, comme l'attend l'opérateur PDF `rg`. */
export type PdfColor = [number, number, number];

const BLACK: PdfColor = [0.06, 0.06, 0.06];

/** Largeur d'un texte, en points, pour une police et une taille données. */
export function measureText(text: string, size: number, font: PdfFont = "regular"): number {
  const table = font === "bold" ? WIDTHS_BOLD : WIDTHS_REGULAR;
  let thousandths = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    // Hors ASCII imprimable (accents compris) : on prend la largeur d'un « e »,
    // très proche de celle des voyelles accentuées.
    thousandths += code >= 32 && code <= 126 ? table[code - 32] : table["e".charCodeAt(0) - 32];
  }
  return (thousandths * size) / 1000;
}

/**
 * Échappe les trois caractères qui ont un sens dans une chaîne PDF, puis
 * encode en Latin-1 : c'est ce qu'attend WinAnsiEncoding.
 */
function escapeText(text: string): string {
  return text.replace(/[\\()]/g, (match) => `\\${match}`);
}

export type TextOptions = {
  size?: number;
  font?: PdfFont;
  color?: PdfColor;
  align?: PdfAlign;
  /** Largeur de référence pour un alignement à droite ou centré. */
  width?: number;
};

/**
 * Document en cours d'écriture. Les coordonnées sont exprimées depuis le COIN
 * SUPÉRIEUR gauche (y vers le bas), comme on lit une page - le repère PDF
 * natif, lui, part du bas ; la conversion est faite ici une fois pour toutes.
 */
export function createPdfDocument() {
  const operations: string[] = [];
  const images: { name: string; data: Buffer; meta: JpegMeta }[] = [];

  const api = {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,

    text(value: string, x: number, y: number, options: TextOptions = {}) {
      const { size = 10, font = "regular", color = BLACK, align = "left", width = 0 } = options;
      const offset =
        align === "right"
          ? width - measureText(value, size, font)
          : align === "center"
            ? (width - measureText(value, size, font)) / 2
            : 0;

      operations.push(
        `${color[0]} ${color[1]} ${color[2]} rg`,
        "BT",
        `/${font === "bold" ? "F2" : "F1"} ${size} Tf`,
        `1 0 0 1 ${(x + offset).toFixed(2)} ${(PAGE_HEIGHT - y).toFixed(2)} Tm`,
        `(${escapeText(value)}) Tj`,
        "ET",
      );
      return api;
    },

    rect(x: number, y: number, w: number, h: number, color: PdfColor) {
      operations.push(
        `${color[0]} ${color[1]} ${color[2]} rg`,
        `${x.toFixed(2)} ${(PAGE_HEIGHT - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
      );
      return api;
    },

    /** Filet horizontal : un rectangle d'un demi-point de haut. */
    line(x: number, y: number, w: number, color: PdfColor = [0.85, 0.83, 0.79]) {
      return api.rect(x, y, w, 0.6, color);
    },

    /**
     * Place une image JPEG. `x`, `y` visent le COIN SUPÉRIEUR gauche, comme le
     * texte. Donner `width` ou `height` (ou les deux) ; la dimension absente
     * suit le ratio d'origine.
     */
    image(jpeg: Buffer, x: number, y: number, options: { width?: number; height?: number }) {
      if (!options.width && !options.height) throw new Error("image() : préciser width ou height.");
      const meta = readJpegMeta(jpeg);
      const w = options.width ?? (options.height! * meta.width) / meta.height;
      const h = options.height ?? (options.width! * meta.height) / meta.width;
      const name = `Im${images.length + 1}`;
      images.push({ name, data: jpeg, meta });
      operations.push(
        "q",
        `${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(PAGE_HEIGHT - y - h).toFixed(2)} cm`,
        `/${name} Do`,
        "Q",
      );
      return api;
    },

    /**
     * Écrit un paragraphe en coupant aux espaces. Renvoie l'ordonnée juste
     * sous la dernière ligne, pour enchaîner le bloc suivant.
     */
    paragraph(value: string, x: number, y: number, maxWidth: number, options: TextOptions = {}) {
      const { size = 9, font = "regular" } = options;
      const lineHeight = size * 1.45;
      let cursor = y;
      let current = "";

      for (const word of value.split(/\s+/).filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (measureText(candidate, size, font) > maxWidth && current) {
          api.text(current, x, cursor, options);
          cursor += lineHeight;
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) {
        api.text(current, x, cursor, options);
        cursor += lineHeight;
      }
      return cursor;
    },

    /** Assemble le fichier PDF complet. */
    build(): Buffer {
      const content = Buffer.from(operations.join("\n"), "latin1");

      // Objets fixes : catalogue, pages, page, contenu, F1, F2. Les images
      // viennent ensuite, numérotées à la suite.
      const FIXED_OBJECTS = 6;
      const xobjects = images.length
        ? ` /XObject << ${images.map((img, i) => `/${img.name} ${FIXED_OBJECTS + i + 1} 0 R`).join(" ")} >>`
        : "";

      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Resources << /Font << /F1 5 0 R /F2 6 0 R >>${xobjects} >> /Contents 4 0 R >>`,
        `<< /Length ${content.length} >>\nstream\n${content.toString("latin1")}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        ...images.map(
          (img) =>
            `<< /Type /XObject /Subtype /Image /Width ${img.meta.width} /Height ${img.meta.height} ` +
            `/ColorSpace /${img.meta.colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\n` +
            `stream\n${img.data.toString("latin1")}\nendstream`,
        ),
      ];

      let pdf = "%PDF-1.4\n";
      const offsets: number[] = [];
      objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(pdf, "latin1"));
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
      });

      // Table de références croisées : elle indique au lecteur PDF l'octet
      // exact où commence chaque objet. Un décalage faux = fichier illisible.
      const startxref = Buffer.byteLength(pdf, "latin1");
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (const offset of offsets) pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

      return Buffer.from(pdf, "latin1");
    },
  };

  return api;
}
