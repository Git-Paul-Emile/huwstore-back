/**
 * Generation de CSV.
 *
 * Le back-office remplace un cahier et un fichier Excel : l'export doit pouvoir
 * s'ouvrir directement dans Excel en francais. D'ou deux details qui ne sont
 * pas cosmetiques :
 *  - separateur point-virgule, attendu par Excel en locale francaise ;
 *  - BOM UTF-8 en tete, sans lequel Excel affiche « Ã© » a la place de « é ».
 */

const SEPARATOR = ";";
const BOM = "﻿";

/** Neutralise les formules : une cellule commencant par = est executee par Excel. */
function escapeCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => unknown }[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(SEPARATOR);
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(SEPARATOR));
  return BOM + [head, ...body].join("\r\n");
}
