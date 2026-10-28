import { RANK_ICON, isRank } from "@/lib/rules";

/** Esagono numerato del rank (icona originale del progetto, dal design). */
export function RankIcon({ rank, size = 24 }: { rank: string; size?: number }) {
  const icon = isRank(rank) ? RANK_ICON[rank] : null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <path
        d="M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z"
        fill={icon ? `var(--color-rank-${icon.key})` : "var(--dot-base)"}
        stroke="var(--edge)"
        strokeWidth={1.5}
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="#fff"
        fontFamily="var(--font-nunito), sans-serif"
      >
        {icon ? icon.num : "?"}
      </text>
    </svg>
  );
}

/** Icona + nome del rank. */
export function RankLabel({ rank, size = 22 }: { rank: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-extrabold">
      <RankIcon rank={rank} size={size} />
      {rank || "—"}
    </span>
  );
}
