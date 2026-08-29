/**
 * Contrat public de l'API, au format OpenAPI 3.1 (rules/api.md).
 *
 * Il est écrit à la main et volontairement à côté du code plutôt que généré :
 * il décrit ce que l'API PROMET, pas ce qu'elle fait aujourd'hui. Toute
 * modification d'un endpoint doit se répercuter ici - c'est ce document que
 * lira le prochain développeur, pas les contrôleurs.
 *
 * Il est servi sur /api/v1/docs (page lisible) et /api/v1/docs/openapi.json
 * (fichier importable dans Postman ou Insomnia).
 */

const envelope = (dataSchema: object, paginated = false) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    message: { type: "string", example: "Ressource récupérée." },
    data: dataSchema,
    ...(paginated ? { meta: { $ref: "#/components/schemas/PaginationMeta" } } : {}),
  },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const list = (name: string) => ({ type: "array", items: ref(name) });

const json = (schema: object) => ({ content: { "application/json": { schema } } });

const ok = (description: string, schema: object, paginated = false) => ({
  description,
  ...json(envelope(schema, paginated)),
});

const errors = {
  400: { description: "Données invalides.", ...json(ref("ErrorResponse")) },
  401: { description: "Authentification requise.", ...json(ref("ErrorResponse")) },
  403: { description: "Réservé aux administrateurs.", ...json(ref("ErrorResponse")) },
  404: { description: "Ressource introuvable.", ...json(ref("ErrorResponse")) },
  429: { description: "Trop de requêtes.", ...json(ref("ErrorResponse")) },
};

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Identifiant de la ressource.",
};

const adminSecurity = [{ bearerAuth: [] }];

/** Raccourci : les quatre paramètres attendus sur toute collection REST. */
const collectionParams = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 }, description: "Page demandée." },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 }, description: "Taille de page." },
  { name: "search", in: "query", schema: { type: "string" }, description: "Recherche plein texte." },
];

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "API HUWSTORE",
    version: "1.0.0",
    description:
      "API de la boutique HUWSTORE (sacs et maroquinerie, Sénégal).\n\n" +
      "**Encaissement** : uniquement à la livraison, en espèces. Aucun paiement en ligne.\n\n" +
      "**Authentification** : jeton d'accès JWT (15 min) transmis en `Authorization: Bearer …`, " +
      "renouvelé par `POST /auth/refresh` grâce au cookie de rafraîchissement `HttpOnly`.\n\n" +
      "**Enveloppe** : toute réponse a la forme `{ status, message, data }`, complétée de `meta` " +
      "pour les collections paginées.",
    contact: { name: "HUWSTORE", url: "https://huwstore.com" },
  },
  servers: [{ url: "/api/v1", description: "Version courante" }],
  tags: [
    { name: "Authentification" },
    { name: "Catalogue" },
    { name: "Commandes" },
    { name: "Compte client" },
    { name: "Avis" },
    { name: "Back-office" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentification"],
        summary: "Créer un compte client",
        requestBody: { required: true, ...json(ref("RegisterInput")) },
        responses: { 201: ok("Compte créé.", ref("Session")), 409: { description: "Numéro déjà utilisé." }, ...errors },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentification"],
        summary: "Ouvrir une session",
        description: "Dix tentatives échouées par quart d'heure et par adresse IP.",
        requestBody: { required: true, ...json(ref("LoginInput")) },
        responses: { 200: ok("Session ouverte.", ref("Session")), ...errors },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentification"],
        summary: "Renouveler le jeton d'accès",
        description: "Lit le cookie `HttpOnly` de rafraîchissement. Aucun corps de requête.",
        responses: { 200: ok("Jeton renouvelé.", ref("Session")), ...errors },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentification"],
        summary: "Fermer la session",
        responses: { 200: ok("Déconnecté.", { type: "null" }) },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentification"],
        summary: "Profil connecté",
        security: adminSecurity,
        responses: { 200: ok("Utilisateur récupéré.", ref("User")), ...errors },
      },
      patch: {
        tags: ["Compte client"],
        summary: "Modifier son profil",
        description:
          "Nom, e-mail et mot de passe. Le téléphone n'est pas modifiable : c'est l'identifiant de connexion. " +
          "Changer de mot de passe exige le mot de passe actuel.",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("ProfileInput")) },
        responses: { 200: ok("Informations mises à jour.", ref("User")), ...errors },
      },
    },

    "/products": {
      get: {
        tags: ["Catalogue"],
        summary: "Lister les produits",
        description: "Pagination, recherche, filtres multi-valeurs et tri - les quatre attendus d'une collection.",
        parameters: [
          ...collectionParams,
          { name: "category", in: "query", schema: { type: "string" }, description: "Slugs séparés par des virgules." },
          {
            name: "material",
            in: "query",
            schema: { type: "string" },
            description: "Matières séparées par des virgules.",
          },
          { name: "color", in: "query", schema: { type: "string" }, description: "Coloris séparés par des virgules." },
          { name: "minPrice", in: "query", schema: { type: "integer" } },
          { name: "maxPrice", in: "query", schema: { type: "integer" } },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["featured", "best", "price-asc", "price-desc", "new"],
              default: "featured",
            },
            description: "`best` classe par quantités réellement vendues.",
          },
        ],
        responses: { 200: ok("Produits récupérés.", list("Product"), true), ...errors },
      },
      post: {
        tags: ["Back-office"],
        summary: "Créer un produit avec ses déclinaisons",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("ProductInput")) },
        responses: { 201: ok("Produit créé.", ref("Product")), ...errors },
      },
    },
    "/products/facets": {
      get: {
        tags: ["Catalogue"],
        summary: "Facettes de filtre calculées depuis le catalogue",
        responses: { 200: ok("Facettes récupérées.", ref("Facets")), ...errors },
      },
    },
    "/products/{id}": {
      get: {
        tags: ["Catalogue"],
        summary: "Fiche produit (identifiant ou slug)",
        parameters: [idParam],
        responses: { 200: ok("Produit récupéré.", ref("Product")), ...errors },
      },
      patch: {
        tags: ["Back-office"],
        summary: "Modifier un produit",
        security: adminSecurity,
        parameters: [idParam],
        requestBody: { required: true, ...json(ref("ProductInput")) },
        responses: { 200: ok("Produit mis à jour.", ref("Product")), ...errors },
      },
      delete: {
        tags: ["Back-office"],
        summary: "Désactiver un produit",
        description: "Désactivation et non suppression : les commandes passées le référencent.",
        security: adminSecurity,
        parameters: [idParam],
        responses: { 200: ok("Produit désactivé.", { type: "null" }), ...errors },
      },
    },

    "/categories": {
      get: {
        tags: ["Catalogue"],
        summary: "Lister les catégories",
        responses: { 200: ok("Catégories récupérées.", list("Category")) },
      },
      post: {
        tags: ["Back-office"],
        summary: "Créer une catégorie",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("CategoryInput")) },
        responses: { 201: ok("Catégorie créée.", ref("Category")), ...errors },
      },
    },
    "/categories/{id}": {
      patch: {
        tags: ["Back-office"],
        summary: "Modifier une catégorie",
        security: adminSecurity,
        parameters: [idParam],
        requestBody: { required: true, ...json(ref("CategoryInput")) },
        responses: { 200: ok("Catégorie mise à jour.", ref("Category")), ...errors },
      },
      delete: {
        tags: ["Back-office"],
        summary: "Supprimer une catégorie vide",
        security: adminSecurity,
        parameters: [idParam],
        responses: { 200: ok("Catégorie supprimée.", { type: "null" }), ...errors },
      },
    },

    "/orders": {
      get: {
        tags: ["Back-office"],
        summary: "Lister les commandes",
        security: adminSecurity,
        parameters: [
          ...collectionParams,
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "pay", in: "query", schema: { type: "string" } },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["recent", "oldest", "total-desc", "total-asc"] },
          },
        ],
        responses: { 200: ok("Commandes récupérées.", list("Order"), true), ...errors },
      },
      post: {
        tags: ["Commandes"],
        summary: "Passer une commande",
        security: adminSecurity,
        description:
          "Réservée au compte connecté : la commande en invité n'est plus ouverte. " +
          "La commande est rattachée au compte et apparaît dans son historique.\n\n" +
          "Les montants ne sont jamais lus depuis la requête : le serveur recalcule prix, frais de port et remise.",
        requestBody: { required: true, ...json(ref("OrderInput")) },
        responses: { 201: ok("Commande créée.", ref("Order")), ...errors },
      },
    },
    "/orders/mine": {
      get: {
        tags: ["Compte client"],
        summary: "Mes commandes",
        security: adminSecurity,
        responses: { 200: ok("Vos commandes récupérées.", list("Order")), ...errors },
      },
    },
    "/orders/export": {
      get: {
        tags: ["Back-office"],
        summary: "Exporter les commandes en CSV",
        security: adminSecurity,
        responses: {
          200: { description: "Fichier CSV.", content: { "text/csv": { schema: { type: "string" } } } },
          ...errors,
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Commandes"],
        summary: "Consulter une commande",
        security: adminSecurity,
        description: "Réservée au compte connecté, propriétaire de la commande.",
        parameters: [idParam],
        responses: { 200: ok("Commande récupérée.", ref("Order")), ...errors },
      },
      patch: {
        tags: ["Back-office"],
        summary: "Mettre à jour le statut, le paiement ou le suivi",
        security: adminSecurity,
        parameters: [idParam],
        requestBody: { required: true, ...json(ref("OrderUpdateInput")) },
        responses: { 200: ok("Commande mise à jour.", ref("Order")), ...errors },
      },
    },
    "/orders/{id}/invoice": {
      get: {
        tags: ["Commandes"],
        summary: "Télécharger la facture PDF",
        security: adminSecurity,
        parameters: [idParam],
        responses: {
          200: {
            description: "Facture PDF.",
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
          ...errors,
        },
      },
    },

    "/delivery-zones": {
      get: {
        tags: ["Catalogue"],
        summary: "Zones de livraison ouvertes",
        responses: { 200: ok("Zones récupérées.", list("DeliveryZone")) },
      },
      post: {
        tags: ["Back-office"],
        summary: "Ouvrir une zone",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("DeliveryZone")) },
        responses: { 201: ok("Zone créée.", ref("DeliveryZone")), ...errors },
      },
    },
    "/promos/validate": {
      post: {
        tags: ["Commandes"],
        summary: "Vérifier un code de réduction",
        description: "Prévisualise la remise sans rien enregistrer. Ne révèle aucun autre code.",
        requestBody: { required: true, ...json(ref("PromoValidateInput")) },
        responses: { 200: ok("Code valide.", ref("PromoQuote")), ...errors },
      },
    },
    "/banners": {
      get: {
        tags: ["Catalogue"],
        summary: "Bannières publiées",
        description: "Par défaut, seules les bannières actives dans leur fenêtre de diffusion.",
        parameters: [
          { name: "slot", in: "query", schema: { type: "string", enum: ["Hero", "Bandeau promo", "Pop-up"] } },
        ],
        responses: { 200: ok("Bannières récupérées.", list("Banner")) },
      },
    },
    "/testimonials": {
      get: {
        tags: ["Catalogue"],
        summary: "Témoignages publiés",
        responses: { 200: ok("Témoignages récupérés.", list("Testimonial")) },
      },
    },
    "/feedback": {
      post: {
        tags: ["Avis"],
        summary: "Déposer un avis sur le site",
        description:
          "Ouvert à toute visiteuse, avec ou sans compte. N'est jamais publié automatiquement : lu et traité depuis le back-office.",
        requestBody: { required: true, ...json(ref("FeedbackInput")) },
        responses: { 201: ok("Avis déposé.", ref("Feedback")), ...errors },
      },
      get: {
        tags: ["Back-office"],
        summary: "Lister les avis déposés sur le site",
        security: adminSecurity,
        responses: { 200: ok("Avis récupérés.", list("Feedback")), ...errors },
      },
    },
    "/feedback/{id}": {
      parameters: [idParam],
      patch: {
        tags: ["Back-office"],
        summary: "Marquer un avis comme lu",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("FeedbackUpdateInput")) },
        responses: { 200: ok("Avis mis à jour.", ref("Feedback")), ...errors },
      },
      delete: {
        tags: ["Back-office"],
        summary: "Supprimer un avis",
        security: adminSecurity,
        responses: { 200: ok("Avis supprimé.", { type: "null" }), ...errors },
      },
    },
    "/settings": {
      get: {
        tags: ["Catalogue"],
        summary: "Paramètres publics de la boutique",
        responses: { 200: ok("Paramètres récupérés.", ref("Settings")) },
      },
      patch: {
        tags: ["Back-office"],
        summary: "Modifier les paramètres",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("Settings")) },
        responses: { 200: ok("Paramètres mis à jour.", ref("Settings")), ...errors },
      },
    },
    "/media": {
      post: {
        tags: ["Back-office"],
        summary: "Téléverser une image ou une vidéo",
        description:
          "Reçoit un fichier encodé en base64 (`data:image/...` jusqu'à 8 Mo, ou `data:video/...` jusqu'à 40 Mo) " +
          "et le dépose sur Cloudinary.",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("MediaInput")) },
        responses: { 201: ok("Média téléversé.", ref("Media")), ...errors },
      },
    },
    "/stock": {
      get: {
        tags: ["Back-office"],
        summary: "État du stock par déclinaison",
        security: adminSecurity,
        responses: { 200: ok("Stock récupéré.", list("StockLevel")), ...errors },
      },
    },
    "/stock/export": {
      get: {
        tags: ["Back-office"],
        summary: "Exporter l'inventaire en CSV",
        security: adminSecurity,
        responses: { 200: { description: "Fichier CSV." }, ...errors },
      },
    },
    "/stock/adjust": {
      post: {
        tags: ["Back-office"],
        summary: "Corriger un stock (entrée, sortie, ajustement)",
        security: adminSecurity,
        requestBody: { required: true, ...json(ref("StockAdjustInput")) },
        responses: { 200: ok("Stock ajusté.", ref("StockLevel")), ...errors },
      },
    },
    "/stats/dashboard": {
      get: {
        tags: ["Back-office"],
        summary: "Indicateurs du jour",
        security: adminSecurity,
        responses: { 200: ok("Indicateurs récupérés.", ref("Dashboard")), ...errors },
      },
    },
    "/stats/top-products": {
      get: {
        tags: ["Back-office"],
        summary: "Sacs les plus vendus",
        security: adminSecurity,
        responses: { 200: ok("Classement récupéré.", { type: "array", items: { type: "object" } }), ...errors },
      },
    },
    "/stats/overview": {
      get: {
        tags: ["Back-office"],
        summary: "Chiffres clés sur une fenêtre glissante",
        description: "Nombre de commandes, chiffre d'affaires, panier moyen et articles vendus sur `days` jours.",
        security: adminSecurity,
        parameters: [
          { name: "days", in: "query", schema: { type: "integer", default: 30, minimum: 1, maximum: 365 } },
        ],
        responses: { 200: ok("Chiffres clés récupérés.", { type: "object" }), ...errors },
      },
    },
    "/clients": {
      get: {
        tags: ["Back-office"],
        summary: "Lister les clientes",
        security: adminSecurity,
        responses: { 200: ok("Clients récupérés.", list("Client")), ...errors },
      },
    },
    "/clients/export": {
      get: {
        tags: ["Back-office"],
        summary: "Exporter les clientes en CSV",
        security: adminSecurity,
        responses: { 200: { description: "Fichier CSV." }, ...errors },
      },
    },
    "/addresses": {
      get: {
        tags: ["Compte client"],
        summary: "Mon carnet d'adresses",
        security: adminSecurity,
        responses: { 200: ok("Adresses récupérées.", { type: "array", items: { type: "object" } }), ...errors },
      },
    },
    "/wishlist": {
      get: {
        tags: ["Compte client"],
        summary: "Mes favoris",
        security: adminSecurity,
        responses: { 200: ok("Favoris récupérés.", list("Product")), ...errors },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Jeton d'accès de 15 minutes." },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["fail", "error", "not_found", "unauthorized"] },
          message: { type: "string" },
          data: { type: "null" },
          errors: {
            type: "array",
            items: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } },
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
          hasNext: { type: "boolean" },
          hasPrev: { type: "boolean" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          phone: { type: "string", example: "771234567" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["CLIENT", "ADMIN"] },
        },
      },
      Session: {
        type: "object",
        properties: { user: ref("User"), accessToken: { type: "string" } },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "phone", "password"],
        properties: {
          name: { type: "string" },
          phone: { type: "string", example: "77 123 45 67" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      ProfileInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email", nullable: true },
          currentPassword: { type: "string", description: "Obligatoire pour changer de mot de passe." },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      LoginInput: {
        type: "object",
        required: ["phone", "password"],
        properties: { phone: { type: "string" }, password: { type: "string" } },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          image: { type: "string", format: "uri" },
          position: { type: "integer" },
          products: { type: "integer", description: "Nombre de produits rattachés." },
        },
      },
      CategoryInput: {
        type: "object",
        required: ["name", "image"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          image: { type: "string" },
          position: { type: "integer" },
        },
      },
      ProductVariant: {
        type: "object",
        properties: {
          id: { type: "string" },
          sku: { type: "string" },
          color: { type: "string" },
          colorSlug: { type: "string" },
          hex: { type: "string", example: "#1a1a1a" },
          images: {
            type: "array",
            items: { type: "object", properties: { url: { type: "string" }, alt: { type: "string" } } },
          },
          stock: { type: "object", properties: { qty: { type: "integer" }, threshold: { type: "integer" } } },
          available: { type: "boolean" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          collection: { type: "string" },
          category: { type: "string" },
          categorySlug: { type: "string" },
          material: { type: "string" },
          description: { type: "string" },
          care: { type: "string" },
          price: { type: "integer", description: "Prix en FCFA, entier." },
          compareAt: { type: "integer", description: "Prix barré." },
          badge: { type: "string", enum: ["Nouveau", "Promo", "Rupture"] },
          videoUrl: { type: "string" },
          includedAccessory: { type: "string", description: "Ex. « Livré avec une pochette assortie »." },
          variants: list("ProductVariant"),
          active: { type: "boolean" },
        },
      },
      ProductInput: {
        type: "object",
        required: ["name", "collection", "categoryId", "material", "description", "care", "price", "variants"],
        properties: {
          name: { type: "string" },
          collection: { type: "string" },
          categoryId: { type: "string" },
          material: { type: "string" },
          description: { type: "string" },
          care: { type: "string" },
          price: { type: "integer" },
          compareAt: { type: "integer" },
          badge: { type: "string", enum: ["Nouveau", "Promo", "Rupture"] },
          includedAccessory: { type: "string" },
          variants: { type: "array", minItems: 1, items: { type: "object" } },
        },
      },
      Facets: {
        type: "object",
        properties: {
          materials: { type: "array", items: { type: "string" } },
          colors: { type: "array", items: { type: "object" } },
          priceMin: { type: "integer" },
          priceMax: { type: "integer" },
        },
      },
      DeliveryZone: {
        type: "object",
        properties: {
          id: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          fee: { type: "integer" },
          freeFrom: { type: "integer", description: "Montant à partir duquel la livraison est offerte." },
          delay: { type: "string", example: "24 h" },
          relay: { type: "boolean" },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          productId: { type: "string" },
          variantId: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
          qty: { type: "integer" },
          price: { type: "integer" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          client: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          addressLine: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          deliveryMode: { type: "string", enum: ["Domicile", "Point relais"] },
          items: list("OrderItem"),
          subtotal: { type: "integer" },
          shippingFee: { type: "integer" },
          discount: { type: "integer" },
          promoCode: { type: "string" },
          total: { type: "integer" },
          pay: { type: "string", enum: ["Payé", "En attente", "Échoué"] },
          method: { type: "string", enum: ["Paiement à la livraison"] },
          status: {
            type: "string",
            enum: ["En préparation", "Expédiée", "En cours de livraison", "Livrée", "Retournée"],
          },
          date: { type: "string", format: "date-time" },
        },
      },
      OrderInput: {
        type: "object",
        required: ["client", "phone", "addressLine", "city", "country", "items"],
        properties: {
          client: { type: "string" },
          phone: { type: "string", example: "77 123 45 67" },
          email: { type: "string", format: "email" },
          addressLine: { type: "string" },
          landmark: { type: "string", description: "Repère de livraison." },
          city: { type: "string" },
          country: { type: "string" },
          deliveryMode: { type: "string", enum: ["Domicile", "Point relais"] },
          deliveryZoneId: { type: "string" },
          method: { type: "string", enum: ["Paiement à la livraison"] },
          promoCode: { type: "string" },
          note: { type: "string" },
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["variantId", "qty"],
              properties: { variantId: { type: "string" }, qty: { type: "integer" } },
            },
          },
        },
      },
      OrderUpdateInput: {
        type: "object",
        properties: {
          status: { type: "string" },
          pay: { type: "string" },
          courier: { type: "string" },
          tracking: { type: "string" },
        },
      },
      PromoValidateInput: {
        type: "object",
        required: ["code", "items"],
        properties: {
          code: { type: "string" },
          deliveryZoneId: { type: "string" },
          deliveryMode: { type: "string" },
          items: { type: "array", items: { type: "object" } },
        },
      },
      PromoQuote: {
        type: "object",
        properties: {
          code: { type: "string" },
          label: { type: "string", example: "-10 %" },
          subtotal: { type: "integer" },
          shippingFee: { type: "integer" },
          discount: { type: "integer" },
          total: { type: "integer" },
        },
      },
      Banner: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          text: { type: "string" },
          ctaLabel: { type: "string" },
          ctaHref: { type: "string" },
          slot: { type: "string", enum: ["Hero", "Bandeau promo", "Pop-up"] },
          target: { type: "string", enum: ["Toutes", "Mobile", "Desktop"] },
          focus: { type: "string", enum: ["center", "top", "bottom"] },
          position: { type: "integer" },
          start: { type: "string", format: "date-time" },
          end: { type: "string", format: "date-time" },
          active: { type: "boolean" },
          image: { type: "string", format: "uri" },
        },
      },
      Testimonial: {
        type: "object",
        properties: {
          id: { type: "string" },
          author: { type: "string" },
          role: { type: "string" },
          text: { type: "string" },
          avatar: { type: "string" },
          position: { type: "integer" },
          active: { type: "boolean" },
        },
      },
      Feedback: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          message: { type: "string" },
          read: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      FeedbackInput: {
        type: "object",
        required: ["message"],
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          message: { type: "string" },
        },
      },
      FeedbackUpdateInput: {
        type: "object",
        required: ["read"],
        properties: {
          read: { type: "boolean" },
        },
      },
      Settings: {
        type: "object",
        properties: {
          shopName: { type: "string" },
          phone: { type: "string" },
          whatsapp: { type: "string", description: "Format international sans +, pour wa.me." },
          email: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          instagramUrl: { type: "string" },
          facebookUrl: { type: "string" },
          tiktokUrl: { type: "string" },
          announcement: { type: "string" },
        },
      },
      MediaInput: {
        type: "object",
        required: ["file"],
        properties: {
          file: { type: "string", description: "Image ou vidéo encodée en data URI base64." },
          folder: { type: "string", enum: ["produits", "categories", "bannieres", "temoignages"] },
          label: { type: "string" },
        },
      },
      Media: {
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          publicId: { type: "string" },
          width: { type: "integer" },
          height: { type: "integer" },
        },
      },
      StockLevel: {
        type: "object",
        properties: {
          variantId: { type: "string" },
          sku: { type: "string" },
          product: { type: "string" },
          color: { type: "string" },
          qty: { type: "integer" },
          threshold: { type: "integer" },
        },
      },
      StockAdjustInput: {
        type: "object",
        required: ["variantId", "type", "qty", "reason"],
        properties: {
          variantId: { type: "string" },
          type: { type: "string", enum: ["Entrée", "Sortie", "Ajustement"] },
          qty: { type: "integer" },
          reason: { type: "string" },
        },
      },
      Dashboard: {
        type: "object",
        properties: {
          revenueToday: { type: "integer" },
          pendingOrders: { type: "integer" },
          lowStockCount: { type: "integer" },
          newClientsToday: { type: "integer" },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          city: { type: "string" },
          orders: { type: "integer" },
          spent: { type: "integer" },
          segment: { type: "string", enum: ["VIP", "Fidèle", "Nouveau", "Inactif"] },
        },
      },
    },
  },
} as const;
