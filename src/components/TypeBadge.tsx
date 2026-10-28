import type { CSSProperties } from "react";

/** Testo scuro sui tipi con colore chiaro, per mantenere il contrasto (dal design). */
const DARK_INK: Record<string, string> = {
  electric: "#1a1a1a",
  ice: "#0b2a30",
  fairy: "#2a0a1c",
};

/** Variabili CSS del tipo, usate da `.tb` (badge) e `.tint` (sfondo tenue). */
export function typeStyle(type: string | undefined): CSSProperties {
  const key = (type ?? "normal").toLowerCase();
  return {
    "--type-color": `var(--color-type-${key}, #6e6e5e)`,
    "--type-ink": DARK_INK[key] ?? "#fff",
  } as CSSProperties;
}

export function TypeBadge({ type, className = "" }: { type: string; className?: string }) {
  return (
    <span className={`tb ${className}`} style={typeStyle(type)}>
      {type}
    </span>
  );
}

export function TypeBadges({ types }: { types: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {types.map((t) => (
        <TypeBadge key={t} type={t} />
      ))}
    </span>
  );
}
