import { Router } from "express";
import { productRepository } from "../repositories/product.repository.js";
import { TtlCache } from "../lib/cache.js";
import { env } from "../config/env.js";

/**
 * Plan du site (rules/SEO.md).
 *
 * Généré depuis la base : chaque fiche produit active y figure avec sa date de
 * dernière modification, et une fiche retirée disparaît du plan au prochain
 * cache expiré. Les URLs correspondent exactement aux URL canoniques posées
 * par le front (`/produit/<id>`), sinon Google verrait deux adresses pour une
 * même page.
 *
 * Les pages privées (compte, tunnel de commande, reçus, back-office) sont
 * absentes par construction : elles portent déjà `noindex` et n'ont rien à
 * faire dans un plan de site.
 */
export const sitemapRouter = Router();

const SITE_URL = env.SITE_URL.replace(/\/$/, "");

/** Le plan change avec le catalogue : 10 min de cache suffisent largement. */
const cache = new TtlCache(10 * 60 * 1000);

type UrlEntry = { loc: string; lastmod?: string; changefreq: string; priority: string };

const STATIC_ENTRIES: UrlEntry[] = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/boutique", changefreq: "daily", priority: "0.9" },
  { loc: "/contact", changefreq: "yearly", priority: "0.3" },
  { loc: "/cgu", changefreq: "yearly", priority: "0.2" },
  { loc: "/confidentialite", changefreq: "yearly", priority: "0.2" },
];

function renderXml(entries: UrlEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${SITE_URL}${entry.loc}</loc>${lastmod}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function buildSitemap(): Promise<string> {
  const products = await productRepository.findIndexableForSitemap();
  const productEntries: UrlEntry[] = products.map((product) => ({
    loc: `/produit/${product.id}`,
    lastmod: product.updatedAt.toISOString().slice(0, 10),
    changefreq: "weekly",
    priority: "0.8",
  }));
  return renderXml([...STATIC_ENTRIES, ...productEntries]);
}

sitemapRouter.get("/", async (_req, res, next) => {
  try {
    const xml = await cache.remember("sitemap", buildSitemap);
    res.type("application/xml").send(xml);
  } catch (error) {
    next(error);
  }
});
