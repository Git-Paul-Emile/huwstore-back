/**
 * Journal applicatif structuré.
 *
 * Pourquoi pas `console.log` (rules/observability.md) ? Parce qu'en production
 * les journaux sont lus par une machine (Render, un agrégateur de logs, une
 * alerte) : une ligne JSON avec un niveau, un horodatage et des champs nommés
 * se filtre et se surveille, une phrase libre non. En développement on
 * réaffiche la même information en clair pour rester lisible à l'œil.
 *
 * Volontairement sans dépendance : l'API n'a besoin que de quatre niveaux,
 * d'un contexte et d'un masquage des secrets. Le jour où l'on veut du
 * transport (Sentry, Datadog), on remplace CE fichier - aucun appelant ne
 * change, puisque tout le code passe par `logger`.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isProduction = process.env.NODE_ENV === "production";
const minimum = LEVEL_ORDER[(process.env.LOG_LEVEL as Level) ?? (isProduction ? "info" : "debug")] ?? 20;

/** Champs qui ne doivent JAMAIS atterrir dans un journal, même par accident. */
const SECRETS = new Set(["authorization", "cookie", "set-cookie", "password", "passwordhash", "token", "accesstoken", "refreshtoken"]);

/**
 * Recopie le contexte en masquant les secrets et en rendant les erreurs
 * sérialisables (une Error native se sérialise en `{}` en JSON).
 */
function sanitize(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, ...(isProduction ? {} : { stack: value.stack }) };
  }
  if (Array.isArray(value)) return depth > 4 ? "[…]" : value.map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    if (depth > 4) return "[…]";
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRETS.has(key.toLowerCase()) ? "[masqué]" : sanitize(item, depth + 1),
      ]),
    );
  }
  return value;
}

function write(level: Level, context: Record<string, unknown> | string, message?: string) {
  if (LEVEL_ORDER[level] < minimum) return;

  const hasContext = typeof context !== "string";
  const text = hasContext ? (message ?? "") : context;
  const fields = hasContext ? (sanitize(context) as Record<string, unknown>) : {};

  if (isProduction) {
    process.stdout.write(JSON.stringify({ level, time: new Date().toISOString(), message: text, ...fields }) + "\n");
    return;
  }

  const detail = Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : "";
  process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${level.toUpperCase().padEnd(5)} ${text}${detail}\n`);
}

export const logger = {
  debug: (context: Record<string, unknown> | string, message?: string) => write("debug", context, message),
  info: (context: Record<string, unknown> | string, message?: string) => write("info", context, message),
  warn: (context: Record<string, unknown> | string, message?: string) => write("warn", context, message),
  error: (context: Record<string, unknown> | string, message?: string) => write("error", context, message),
};
