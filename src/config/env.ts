import { z } from "zod";

/**
 * Configuration de l'application, lue UNE fois et validée au démarrage
 * (rules/backend.md, rules/security.md).
 *
 * Pourquoi ce fichier : aucun autre module ne doit lire `process.env`
 * directement. Un service qui fait `process.env.X ?? ""` démarre avec une
 * valeur vide et échoue plus tard, en production, sur un cas précis. Ici, une
 * variable requise absente ou mal formée arrête le boot tout de suite, avec un
 * message qui dit quoi corriger.
 *
 * Le schéma Zod est la source de vérité ; le type est dérivé (`z.infer`).
 *
 * Volontairement sans dépendance au `logger` : celui-ci lit lui-même cette
 * configuration. En cas d'échec on écrit sur stderr et on stoppe le process.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),

    // Requis dans tous les environnements.
    DATABASE_URL: z.string().min(1, "requise (chaîne de connexion PostgreSQL)"),
    ACCESS_TOKEN_SECRET: z.string().min(32, "doit faire au moins 32 caractères aléatoires"),
    REFRESH_TOKEN_SECRET: z.string().min(32, "doit faire au moins 32 caractères aléatoires"),

    // Origine(s) du front pour le CORS et URL publique pour les liens d'e-mail.
    // En dev, une valeur localhost suffit ; en production, l'absence est refusée
    // (voir le superRefine plus bas) : un lien de reçu en localhost serait mort.
    CLIENT_URL: z.string().default("http://localhost:5173"),
    SITE_URL: z.string().default("http://localhost:5173"),

    // Services externes optionnels. Absents, l'application démarre en mode
    // dégradé documenté (rules/external-services.md) ; elle ne refuse pas de
    // booter, mais le repli est explicite dans chaque adaptateur.
    CLOUDINARY_URL: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().default("onboarding@resend.dev"),
    SHOP_ADMIN_EMAIL: z.union([z.string().email(), z.literal("")]).default(""),
    SHOP_NAME: z.string().default("HUWSTORE"),

    SENTRY_DSN: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;
    for (const key of ["CLIENT_URL", "SITE_URL"] as const) {
      if (!value[key] || value[key] === "http://localhost:5173") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "requise en production" });
      }
    }
  });

export type Env = z.infer<typeof schema>;

/**
 * Valide une source de variables d'environnement. Séparée du chargement pour
 * pouvoir être testée sans arrêter le process (rules/testing.md).
 */
export function parseEnv(source: NodeJS.ProcessEnv): { ok: true; env: Env } | { ok: false; message: string } {
  const parsed = schema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };

  const details = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")} : ${issue.message}`).join("\n");
  return { ok: false, message: `Configuration invalide, l'API ne démarre pas :\n${details}` };
}

const result = parseEnv(process.env);

if (!result.ok) {
  process.stderr.write(`\n${result.message}\n\n`);
  process.exit(1);
}

export const env = result.env;

export const isProduction = env.NODE_ENV === "production";
