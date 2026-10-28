"use client";

import { useMemo, useState } from "react";
import { normalize } from "./Filters";

export interface Suggestion {
  value: string;
  /** Testo a destra (es. tipo, "Fanmade"). */
  hint?: React.ReactNode;
}

/**
 * Campo di testo con suggerimenti (combobox ARIA): frecce su/giù per scorrere,
 * Invio per scegliere, Esc per chiudere.
 * Con `onPick` (aggiunta a un elenco): Invio sceglie il suggerimento evidenziato,
 * altrimenti il nome esatto o il primo. Senza `onPick` è un campo con completamento.
 */
export function SuggestInput({
  id,
  value,
  onChange,
  onPick,
  options,
  placeholder,
  disabled,
  autoFocus,
  label,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick?: (value: string) => void;
  options: Suggestion[];
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Etichetta solo per i lettori di schermo (quando manca un <label> visibile). */
  label?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useMemo(() => {
    const q = normalize(value);
    if (!q) return [];
    const starts: Suggestion[] = [];
    const contains: Suggestion[] = [];
    for (const o of options) {
      const n = normalize(o.value);
      if (n === q && !onPick) continue;
      if (n.startsWith(q)) starts.push(o);
      else if (n.includes(q)) contains.push(o);
      if (starts.length >= 8) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [value, options, onPick]);
  const shown = open && suggestions.length > 0;
  const optionId = (i: number) => `${id}-opt-${i}`;

  function choose(v: string) {
    setActive(-1);
    if (onPick) onPick(v);
    else {
      onChange(v);
      setOpen(false);
    }
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        id={id}
        className="sheet-field"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint={onPick ? "done" : undefined}
        aria-label={label}
        aria-invalid={invalid || undefined}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-expanded={shown}
        aria-activedescendant={shown && active >= 0 ? optionId(active) : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!suggestions.length) return;
            e.preventDefault();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + suggestions.length) % suggestions.length);
            return;
          }
          if (e.key === "Escape") {
            if (shown) e.preventDefault();
            setOpen(false);
            setActive(-1);
            return;
          }
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (shown && active >= 0) return choose(suggestions[active].value);
          const exact = options.find((o) => normalize(o.value) === normalize(value));
          const pick = exact ?? suggestions[0];
          if (onPick) onPick(pick ? pick.value : value);
          else if (pick) choose(pick.value);
        }}
      />
      {shown && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Suggerimenti"
          className="absolute inset-x-0 top-full z-30 m-0 mt-1 max-h-72 list-none overflow-auto rounded-[14px] border-2 border-edge bg-surface p-0 shadow-[0_4px_0_var(--edge)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.value}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={`flex min-h-11 cursor-pointer items-center gap-2 border-b border-line px-3 py-1.5 text-[15px] font-bold last:border-0 hover:bg-surface2 ${i === active ? "bg-surface2 outline-2 -outline-offset-2 outline-blue" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s.value)}
            >
              <span className="flex-1">{s.value}</span>
              {s.hint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
