"use client";

import { useId, useRef, useState } from "react";
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
import { Sprite } from "./Sprite";

/**
 * Immagine caricabile (§12): file dal dispositivo, inquadrato nella finestra di ritaglio,
 * ridotto e compresso nel browser e caricato su Blob; oppure, se `allowLink`, un link https.
 * Il valore è l'URL da salvare nel record.
 */
export function ImageField({
  kind,
  userId,
  name,
  value,
  onChange,
  allowLink = false,
  disabled = false,
  tileStyle,
  aspect = 1,
}: {
  kind: ImageKind;
  userId: string;
  name: string;
  value: string;
  onChange: (url: string) => void;
  allowLink?: boolean;
  disabled?: boolean;
  tileStyle?: React.CSSProperties;
  /** Proporzioni del ritaglio (larghezza / altezza). */
  aspect?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const linkId = useId();
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
      onChange(await uploadImage(await encodeImage(canvas), kind, userId));
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Caricamento non riuscito");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {picked && (
        <ImageCropper
          bitmap={picked.bitmap}
          src={picked.src}
          aspect={aspect}
          onCancel={closeCropper}
          onConfirm={(area) => void confirm(area)}
        />
      )}
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="tint grid size-[104px] flex-none cursor-pointer place-items-center overflow-hidden rounded-[18px] border-2 border-dashed border-edge p-0 text-[13px] font-extrabold disabled:cursor-default"
          style={tileStyle}
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
          aria-label={value ? "Cambia immagine" : "Carica immagine"}
        >
          {busy ? (
            <span>Caricamento…</span>
          ) : value ? (
            <Sprite key={value} image={value} name={name || "?"} size={96} />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4M7 9l5-5 5 5" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              Carica immagine
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {allowLink && (
            <>
              <label htmlFor={linkId} className="label">
                Oppure link https
              </label>
              <input
                id={linkId}
                type="url"
                inputMode="url"
                className="sheet-field"
                placeholder="https://…"
                value={value}
                disabled={disabled || busy}
                onChange={(e) => {
                  setError(null);
                  onChange(e.target.value.trim());
                }}
              />
            </>
          )}
          {value && !disabled && (
            <button
              type="button"
              className="btn btn-ghost h-10 self-start text-sm"
              onClick={() => onChange("")}
            >
              Togli immagine
            </button>
          )}
          <span className="text-[13px] text-muted">
            JPG, PNG, WebP o GIF: la inquadri tu, poi viene ridotta a 512 px.
          </span>
        </div>
      </div>
      {error && (
        <p className="form-error text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
