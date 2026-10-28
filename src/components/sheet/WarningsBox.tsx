"use client";

import { useEffect, useRef, useState } from "react";

/** Evento con cui la barra in basso riapre il riquadro chiuso. */
export const SHOW_WARNINGS_EVENT = "pokerole:show-warnings";

/**
 * Riquadro avvisi (§6.9): visibile solo se ci sono messaggi; non blocca mai il salvataggio.
 * Si può chiudere: riappare quando cambiano gli avvisi o i cambiamenti.
 */
export function WarningsBox({
  warnings,
  changes,
  className = "",
}: {
  warnings: string[];
  changes: string[];
  className?: string;
}) {
  const content = JSON.stringify([warnings, changes]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function show() {
      setDismissed(null);
      requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "start" }));
    }
    window.addEventListener(SHOW_WARNINGS_EVENT, show);
    return () => window.removeEventListener(SHOW_WARNINGS_EVENT, show);
  }, []);

  if (warnings.length === 0 && changes.length === 0) return null;
  if (dismissed === content) return null;
  return (
    <section
      ref={ref}
      id="avvisi"
      className={`warn-box relative scroll-mt-20 pr-14 ${className}`}
      role="status"
      aria-label="Avvisi"
    >
      <button
        type="button"
        className="absolute top-2 right-2 grid size-11 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-inherit hover:bg-black/10"
        aria-label="Chiudi gli avvisi"
        onClick={() => setDismissed(content)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {changes.length > 0 && (
        <div className="flex flex-col gap-1">
          <strong className="text-[15px]">Cambiamenti</strong>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug">
            {changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l10 18H2z" />
              <path d="M12 10v5M12 18v.5" />
            </svg>
            <strong className="text-[15px]">Da controllare ({warnings.length})</strong>
          </span>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
