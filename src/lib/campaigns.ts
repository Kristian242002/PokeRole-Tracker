/** Codici campagna (§7): 6 caratteri A–Z0–9 senza i caratteri ambigui 0, O, 1, I. */

export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

/** Nuovo codice; `random` restituisce un numero in [0, 1) (iniettabile nei test). */
export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Codice scritto dal giocatore → forma canonica, oppure null se non valido.
 * Tollera minuscole, spazi e trattini.
 */
export function normalizeJoinCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== JOIN_CODE_LENGTH) return null;
  for (const c of code) if (!JOIN_CODE_ALPHABET.includes(c)) return null;
  return code;
}
