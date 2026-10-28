"use client";

import { useState } from "react";
import { SPRITE_BASE } from "@/lib/sprites";

/**
 * Immagine di Pokémon o strumento caricata dal browser (§3.2):
 * HomeSprites → BookSprites → segnaposto. Gli URL completi (fanmade, caricate) si usano così come sono.
 * Quando cambia `image` va rimontato con `key={image}` (§14.10).
 */
export function Sprite({
  image,
  name,
  kind = "pokemon",
  size = 96,
  className = "",
  fluid = false,
}: {
  image: string | null | undefined;
  name: string;
  kind?: "pokemon" | "item";
  size?: number;
  className?: string;
  /** Dimensioni date da `className` (responsive) invece che da `size`. */
  fluid?: boolean;
}) {
  const sources = spriteSources(image, kind);
  const [index, setIndex] = useState(0);
  const src = sources[index];

  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={`grid place-items-center font-display font-semibold ${className}`}
        style={
          fluid
            ? { fontSize: Math.max(12, size * 0.3) }
            : { width: size, height: size, fontSize: Math.max(12, size * 0.3) }
        }
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sprite esterni, senza ottimizzazione di Vercel
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`object-contain ${className}`}
      style={fluid ? undefined : { width: size, height: size }}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

function spriteSources(image: string | null | undefined, kind: "pokemon" | "item"): string[] {
  if (!image) return [];
  if (/^https?:\/\//.test(image)) return [image];
  const file = encodeURIComponent(image);
  if (kind === "item") return [`${SPRITE_BASE}/ItemSprites/${file}`];
  return [`${SPRITE_BASE}/HomeSprites/${file}`, `${SPRITE_BASE}/BookSprites/${file}`];
}

function initials(name: string): string {
  return (
    name
      .replace(/[^\p{L}\p{N}]/gu, "")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}
