"use client";

import { useRef, useState } from "react";
import type { ImageKind } from "@/lib/images";
import {
  ImageError,
  cropImage,
  encodeImage,
  readImage,
  uploadImage,
  type CropArea,
} from "@/lib/upload-client";
import { ImageCropper } from "./ImageCropper";

/**
 * Caricamento immagine (§12): scelta del file, finestra di ritaglio, riduzione a 512 px,
 * WebP e upload su Blob. Restituisce gli elementi da mettere nella pagina (`elements`)
 * e `open()` per aprire la scelta del file.
 */
export function useImageUpload({
  kind,
  userId,
  aspect = 1,
  onUploaded,
}: {
  kind: ImageKind;
  userId: string;
  aspect?: number;
  onUploaded: (url: string) => void | Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ bitmap: ImageBitmap; src: string } | null>(null);

  function closeCropper() {
    if (picked) {
      URL.revokeObjectURL(picked.src);
      picked.bitmap.close();
    }
    setPicked(null);
  }

  /** File scelto → finestra per inquadrarlo. */
  async function pick(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setError(null);
    try {
      setPicked({ bitmap: await readImage(file), src: URL.createObjectURL(file) });
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Non riesco a leggere questa immagine");
    }
  }

  /** Ritaglio confermato → riduzione, compressione e caricamento. */
  async function confirm(area: CropArea) {
    if (!picked) return;
    const canvas = cropImage(picked.bitmap, area);
    closeCropper();
    setBusy(true);
    try {
      await onUploaded(await uploadImage(await encodeImage(canvas), kind, userId));
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Caricamento non riuscito");
    } finally {
      setBusy(false);
    }
  }

  const elements = (
    <>
      {picked && (
        <ImageCropper
          bitmap={picked.bitmap}
          src={picked.src}
          aspect={aspect}
          onCancel={closeCropper}
          onConfirm={(area) => void confirm(area)}
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </>
  );

  return {
    busy,
    error,
    setError,
    elements,
    open: () => fileRef.current?.click(),
  };
}
