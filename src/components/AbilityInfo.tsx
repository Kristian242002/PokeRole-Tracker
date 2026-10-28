"use client";

import { useId, useState } from "react";

/** Abilità con pulsante ⓘ che mostra l'effetto (tocco e tastiera). */
export function AbilityInfo({
  name,
  effect,
  tag,
}: {
  name: string;
  effect: string | null;
  /** Etichetta accanto al nome, es. "Nascosta". */
  tag?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-12 items-center gap-2 rounded-[14px] border-2 border-edge bg-surface2 py-0 pr-1 pl-3">
        <span className="flex-1 text-base font-extrabold">{name}</span>
        {tag && <span className="tag tag-mut">{tag}</span>}
        <button
          type="button"
          className="info-btn"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`Mostra effetto di ${name}`}
          onClick={() => setOpen((o) => !o)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9.5" />
            <path d="M12 11v6M12 7.5v.5" />
          </svg>
        </button>
      </div>
      {open && (
        <p id={id} className="info-box">
          {effect || "Effetto non disponibile."}
        </p>
      )}
    </div>
  );
}
