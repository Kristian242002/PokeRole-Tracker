import "server-only";
import { del } from "@vercel/blob";
import { isOwnBlobUrl } from "./images";

/**
 * Elimina un'immagine caricata dall'utente quando viene sostituita o il record eliminato (§12).
 * I link esterni e gli sprite non si toccano; un errore del Blob non blocca il salvataggio.
 */
export async function deleteOwnBlob(url: string | null | undefined, userId: string) {
  if (!isOwnBlobUrl(url, userId) || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch (error) {
    console.error("Eliminazione immagine non riuscita", url, error);
  }
}
