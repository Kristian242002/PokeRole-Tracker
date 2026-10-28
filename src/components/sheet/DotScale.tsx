"use client";

/**
 * Pallini modificabili (§9): base bloccata e attenuata, investiti pieni, vuoti fino al massimo,
 * attenuati oltre il massimo. `cap` (limite skill del rank) tratteggia le posizioni oltre il limite.
 * Toccare il valore attuale lo abbassa di uno; mai sotto la base.
 */
export function DotScale({
  label,
  value,
  base = 0,
  max,
  slots,
  cap,
  disabled = false,
  onChange,
  width = 24,
}: {
  label: string;
  value: number;
  base?: number;
  max: number;
  slots: number;
  cap?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  width?: number;
}) {
  return (
    <div className="dots" role="group" aria-label={`${label}: ${value}`}>
      {Array.from({ length: slots }, (_, i) => {
        const pos = i + 1;
        const overCap = cap !== undefined && pos > cap;
        let v: string;
        if (pos <= base) v = "base";
        else if (pos <= value) v = overCap || pos > max ? "over" : "fill";
        else if (pos <= max) v = overCap ? "capped" : "empty";
        else v = "void";
        return (
          <button
            key={pos}
            type="button"
            className="dot"
            data-v={v}
            style={{ width }}
            aria-label={`${label}: imposta a ${pos}`}
            aria-pressed={pos <= value}
            disabled={disabled || pos <= base}
            onClick={() => onChange(Math.max(base, pos === value ? pos - 1 : pos))}
          >
            <span />
          </button>
        );
      })}
    </div>
  );
}
