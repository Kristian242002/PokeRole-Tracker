/** Esito delle server action: gli errori dell'utente non sono eccezioni (§13). */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const NOT_FOUND = "Scheda non trovata";
export const LOCKED = "La scheda è bloccata: sbloccala con il lucchetto per modificarla";

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}
