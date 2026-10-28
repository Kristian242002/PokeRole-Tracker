/**
 * Pallini di sola lettura su scala fissa 10: pieni fino alla base,
 * vuoti fino al massimo, attenuati oltre il massimo (§9).
 */
export function AttributeDots({
  base,
  max,
  label,
  description,
}: {
  base: number;
  max: number;
  label: string;
  /** Testo per i lettori di schermo, se diverso da "base N, massimo M". */
  description?: string;
}) {
  return (
    <span
      className="flex flex-1 items-center gap-1.5"
      role="img"
      aria-label={`${label}: ${description ?? `base ${base}, massimo ${max}`}`}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        const cls = n <= base ? "pd pd-f" : n <= max ? "pd pd-e" : "pd pd-v";
        return <span key={n} className={cls} />;
      })}
    </span>
  );
}
