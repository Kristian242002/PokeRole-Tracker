"use client";

import { useMemo, useState } from "react";
import { normalize } from "./Filters";

export interface Suggestion {
  value: string;
  /** Testo a destra (es. tipo, "Fanmade"). */
  hint?: React.ReactNode;
}

/**
 * Campo di testo con suggerimenti filtrati mentre si scrive.
 * Con `onPick` (aggiunta a un elenco): Invio sceglie il nome esatto o il primo suggerimento.
 * Senza `onPick` è un normale campo con completamento.
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
  const [focused, setFocused] = useState(false);
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

  function choose(v: string) {
    if (onPick) onPick(v);
    else onChange(v);
  }

  return (
    <div className="relative">
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
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-expanded={focused && suggestions.length > 0}
        role="combobox"
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const exact = options.find((o) => normalize(o.value) === normalize(value));
          const pick = exact ?? suggestions[0];
          if (onPick) onPick(pick ? pick.value : value);
          else if (pick) onChange(pick.value);
        }}
      />
      {focused && suggestions.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-[14px] border-2 border-edge bg-surface p-0 shadow-[0_4px_0_var(--edge)]"
        >
          {suggestions.map((s) => (
            <li key={s.value} role="option" aria-selected="false">
              <button
                type="button"
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-0 border-b border-line bg-transparent px-3 py-1.5 text-left text-[15px] font-bold hover:bg-surface2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s.value)}
              >
                <span className="flex-1">{s.value}</span>
                {s.hint}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
