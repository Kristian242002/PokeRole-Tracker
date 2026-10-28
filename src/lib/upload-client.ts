"use client";

import { IMAGE_INPUT_TYPES, IMAGE_MAX_BYTES, IMAGE_MAX_SIDE, type ImageKind } from "./images";

/** Errore da mostrare all'utente così com'è. */
export class ImageError extends Error {}

/** Legge il file scelto; le GIF animate diventano il primo fotogramma. */
export async function readImage(file: File): Promise<ImageBitmap> {
  if (!IMAGE_INPUT_TYPES.includes(file.type)) {
    throw new ImageError("Formato non supportato: usa JPG, PNG, WebP o GIF");
  }
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImageError("Non riesco a leggere questa immagine");
  }
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ritaglia l'area scelta e la riduce a lato lungo 512 px (§12). */
export function cropImage(bitmap: ImageBitmap, area: CropArea): HTMLCanvasElement {
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(area.width, area.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** WebP ~0.8; rifiuta oltre 300 KB (§12). */
export async function encodeImage(canvas: HTMLCanvasElement): Promise<Blob> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));
  let blob = await toBlob("image/webp");
  // Safari meno recenti non producono WebP: ripiega su JPEG.
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new ImageError("Conversione dell'immagine non riuscita");
  if (blob.size > IMAGE_MAX_BYTES) {
    throw new ImageError("L'immagine è troppo pesante anche dopo la compressione (max 300 KB)");
  }
  return blob;
}

/** Carica su Vercel Blob; restituisce l'URL pubblico. */
export async function uploadImage(blob: Blob, kind: ImageKind, userId: string): Promise<string> {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  try {
    // La libreria di Blob è pesante: si scarica solo quando serve davvero.
    const { upload } = await import("@vercel/blob/client");
    const result = await upload(`users/${userId}/${kind}/${crypto.randomUUID()}.${ext}`, blob, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: blob.type,
    });
    return result.url;
  } catch {
    const status = await fetch("/api/upload")
      .then((r) => r.json() as Promise<{ configured: boolean }>)
      .catch(() => null);
    if (status && !status.configured) {
      throw new ImageError("Caricamento immagini non configurato su questo server");
    }
    throw new ImageError("Caricamento non riuscito: riprova o usa un link");
  }
}
