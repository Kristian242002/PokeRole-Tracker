"use client";

import { useTransition } from "react";
import type { ImageKind } from "@/lib/images";
import { UploadIcon } from "./ImageField";
import { useImageUpload } from "./useImageUpload";

/**
 * Riquadro immagine delle schede (ritratto allenatore, immagine Pokémon, §12, design 1–2):
 * toccandolo si carica una nuova immagine, salvata subito con `save`.
 * In sola lettura mostra solo l'immagine.
 */
export function ImageTile({
  kind,
  userId,
  label,
  hasCustom,
  aspect,
  editable,
  className = "",
  style,
  save,
  children,
}: {
  kind: ImageKind;
  userId: string;
  /** "Ritratto" o "Immagine". */
  label: string;
  /** C'è un'immagine caricata (si può togliere). */
  hasCustom: boolean;
  aspect: number;
  editable: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Salva il nuovo URL (null = togli); restituisce un errore da mostrare o null. */
  save: (url: string | null) => Promise<string | null>;
  children: React.ReactNode;
}) {
  const [saving, startSaving] = useTransition();
  const upload = useImageUpload({
    kind,
    userId,
    aspect,
    onUploaded: async (url) => {
      const error = await save(url);
      if (error) upload.setError(error);
    },
  });
  const busy = upload.busy || saving;

  if (!editable) {
    return (
      <div
        className={`grid flex-none place-items-center overflow-hidden ${className}`}
        style={style}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-none flex-col items-center gap-1">
      {upload.elements}
      <button
        type="button"
        className={`group relative grid cursor-pointer place-items-center overflow-hidden border-dashed p-0 disabled:cursor-default ${className}`}
        style={style}
        disabled={busy}
        onClick={upload.open}
        aria-label={hasCustom ? `Cambia ${label.toLowerCase()}` : `Carica ${label.toLowerCase()}`}
      >
        {children}
        <span
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-surface/85 py-0.5 text-[11px] font-extrabold text-ink ${busy ? "" : "opacity-90 group-hover:opacity-100"}`}
          aria-hidden="true"
        >
          {busy ? (
            "Caricamento…"
          ) : (
            <>
              <UploadIcon size={13} />
              {label}
            </>
          )}
        </span>
      </button>
      {hasCustom && (
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-1 text-xs font-extrabold text-blue underline"
          disabled={busy}
          onClick={() =>
            startSaving(async () => {
              const error = await save(null);
              upload.setError(error);
            })
          }
        >
          Togli {label.toLowerCase()}
        </button>
      )}
      {upload.error && (
        <p className="form-error max-w-[160px] p-2 text-xs" role="alert">
          {upload.error}
        </p>
      )}
    </div>
  );
}
