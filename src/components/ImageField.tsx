"use client";

import { useId } from "react";
import type { ImageKind } from "@/lib/images";
import { Sprite } from "./Sprite";
import { useImageUpload } from "./useImageUpload";

/**
 * Immagine caricabile dell'editor fanmade (§12): file dal dispositivo (inquadrato e compresso)
 * oppure, se `allowLink`, un link https. Il valore è l'URL da salvare nel record.
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
  const linkId = useId();
  const upload = useImageUpload({ kind, userId, aspect, onUploaded: onChange });

  return (
    <div className="flex flex-col gap-2">
      {upload.elements}
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="tint grid size-[104px] flex-none cursor-pointer place-items-center overflow-hidden rounded-[18px] border-2 border-dashed border-edge p-0 text-[13px] font-extrabold disabled:cursor-default"
          style={tileStyle}
          disabled={disabled || upload.busy}
          onClick={upload.open}
          aria-label={value ? "Cambia immagine" : "Carica immagine"}
        >
          {upload.busy ? (
            <span>Caricamento…</span>
          ) : value ? (
            <Sprite key={value} image={value} name={name || "?"} size={96} />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <UploadIcon />
              Carica immagine
            </span>
          )}
        </button>
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
                disabled={disabled || upload.busy}
                onChange={(e) => {
                  upload.setError(null);
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
      {upload.error && (
        <p className="form-error text-sm" role="alert">
          {upload.error}
        </p>
      )}
    </div>
  );
}

export function UploadIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}
