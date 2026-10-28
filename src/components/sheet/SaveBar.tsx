"use client";

import { SHOW_WARNINGS_EVENT } from "./WarningsBox";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

const TEXT: Record<SaveStatus, string> = {
  saved: "Salvato",
  dirty: "Modifiche non salvate",
  saving: "Salvataggio…",
  error: "Errore nel salvataggio",
};

const DOT: Record<SaveStatus, string> = {
  saved: "bg-ok",
  dirty: "bg-[#d97706]",
  saving: "bg-blue",
  error: "bg-red",
};

/** Barra fissa in basso con lo stato del salvataggio (§9). */
export function SaveBar({
  status,
  error,
  warningCount,
  onSave,
  hidden,
}: {
  status: SaveStatus;
  error?: string | null;
  warningCount: number;
  onSave: () => void;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2.5 border-t-[3px] border-edge bg-surface px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:sticky lg:px-8 lg:py-3.5">
      {warningCount > 0 && (
        <a
          href="#avvisi"
          aria-label={`${warningCount} ${warningCount === 1 ? "avviso" : "avvisi"} da controllare`}
          onClick={() => window.dispatchEvent(new Event(SHOW_WARNINGS_EVENT))}
          className="inline-flex h-10 min-w-[52px] items-center justify-center gap-1 rounded-full bg-warn-bg px-2.5 font-extrabold text-warn-ink no-underline shadow-[inset_0_0_0_1px_var(--warn-line)] hover:text-warn-ink"
        >
          <svg
            width="18"
            height="18"
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
          {warningCount}
        </a>
      )}
      <span
        className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-muted"
        role="status"
        data-testid="save-status"
      >
        <span className={`size-2.5 flex-none rounded-full ${DOT[status]}`} aria-hidden="true" />
        <span className="truncate">{status === "error" && error ? error : TEXT[status]}</span>
      </span>
      <button
        type="button"
        className="btn h-12 px-4"
        onClick={onSave}
        disabled={status === "saved" || status === "saving"}
      >
        Salva modifiche
      </button>
    </footer>
  );
}
