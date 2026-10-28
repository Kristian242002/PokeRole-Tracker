/** Riquadro avvisi (§6.9): visibile solo se ci sono messaggi; non blocca mai il salvataggio. */
export function WarningsBox({
  warnings,
  changes,
  className = "",
}: {
  warnings: string[];
  changes: string[];
  className?: string;
}) {
  if (warnings.length === 0 && changes.length === 0) return null;
  return (
    <section
      id="avvisi"
      className={`warn-box scroll-mt-20 ${className}`}
      role="status"
      aria-label="Avvisi"
    >
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
