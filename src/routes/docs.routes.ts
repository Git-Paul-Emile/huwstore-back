import { Router } from "express";
import { openApiDocument } from "../config/openapi.js";

/**
 * Documentation de l'API (rules/api.md).
 *
 * Deux sorties pour un seul document :
 *  - `/docs/openapi.json` : le contrat brut, importable dans Postman, Insomnia
 *    ou un générateur de client TypeScript ;
 *  - `/docs` : la même chose en page lisible, rendue par Swagger UI chargé
 *    depuis un CDN - l'interface n'est pas embarquée dans le dépôt, ce qui
 *    évite d'installer 4 Mo de fichiers statiques pour une page consultée
 *    quelques fois par mois.
 */
export const docsRouter = Router();

docsRouter.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

const CDN = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5";

const page = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API HUWSTORE - documentation</title>
    <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
    <style>body { margin: 0; background: #faf7f2; } .topbar { display: none; }</style>
  </head>
  <body>
    <div id="swagger"></div>
    <script src="${CDN}/swagger-ui-bundle.js"></script>
    <script>
      window.SwaggerUIBundle({
        url: "openapi.json",
        dom_id: "#swagger",
        docExpansion: "list",
        defaultModelsExpandDepth: 0,
      });
    </script>
  </body>
</html>`;

docsRouter.get("/", (_req, res) => {
  // Cette page - et elle seule - charge des scripts depuis un CDN : on relâche
  // la politique de sécurité de contenu ici plutôt que pour toute l'API.
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `style-src 'self' 'unsafe-inline' ${CDN}`,
      `script-src 'self' 'unsafe-inline' ${CDN}`,
      "img-src 'self' data:",
      "connect-src 'self'",
    ].join("; "),
  );
  res.type("html").send(page);
});
