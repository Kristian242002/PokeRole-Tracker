/** Immagini caricate (§12): regole condivise da browser e server. */

export const IMAGE_KINDS = ["fanmade", "trainer", "pokemon"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const IMAGE_MAX_SIDE = 512;
export const IMAGE_MAX_BYTES = 300 * 1024;
export const IMAGE_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** WebP; JPEG solo se il browser non sa produrre WebP (vecchi Safari). */
export const IMAGE_OUTPUT_TYPES = ["image/webp", "image/jpeg"];

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Percorso valido nel Blob: `users/<userId>/<tipo>/<uuid>.webp` (o .jpg). */
export function isValidImagePath(pathname: string, userId: string): boolean {
  return new RegExp(`^users/${userId}/(${IMAGE_KINDS.join("|")})/${UUID}\\.(webp|jpg)$`).test(
    pathname,
  );
}

/** URL di un blob caricato da questo utente (da eliminare quando viene sostituito). */
export function isOwnBlobUrl(url: string | null | undefined, userId: string): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      isValidImagePath(u.pathname.slice(1), userId)
    );
  } catch {
    return false;
  }
}
