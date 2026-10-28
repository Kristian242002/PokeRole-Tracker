"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { accuracyLine, categoryLabel, damageLine } from "@/lib/rules";
import { CategoryIcon } from "./CategoryIcon";
import { Chevron } from "./Chevron";
import { RankIcon } from "./RankIcon";
import { TypeBadge, typeStyle } from "./TypeBadge";

export interface MoveSummary {
  id: string;
  name: string;
  type: string;
  category: string;
  power: number;
  accuracy: string[];
  damage: string[];
  target: string;
  effect?: string;
  description?: string;
}

interface Details {
  effect: string;
  description: string;
  learners?: { speciesId: string; name: string; rank: string; fanmade: boolean }[];
}

/** Riga compatta di una mossa, espandibile con tutti i dettagli (§9). */
export function MoveRow({
  move,
  rank,
  showLearners = false,
  extra,
  footer,
}: {
  move: MoveSummary;
  /** Icona rank a sinistra, quando pertinente (es. learnset). */
  rank?: string;
  /** Carica e mostra "Chi la impara". */
  showLearners?: boolean;
  /** Contenuto sotto il nome (es. etichetta learnset). */
  extra?: React.ReactNode;
  /** Contenuto in fondo ai dettagli (es. "Togli"). */
  footer?: React.ReactNode;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Details | null>(
    move.effect !== undefined && !showLearners
      ? { effect: move.effect, description: move.description ?? "" }
      : null,
  );
  const [error, setError] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !details) {
      setError(false);
      try {
        const res = await fetch(`/api/mosse/${encodeURIComponent(move.id)}`);
        if (!res.ok) throw new Error(String(res.status));
        setDetails(await res.json());
      } catch {
        setError(true);
      }
    }
  }

  const acc = accuracyLine(move.accuracy);
  const dmg = damageLine(move.damage, move.power);

  return (
    <div className="xrow tint" style={typeStyle(move.type)}>
      <button
        type="button"
        className="xrow-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {rank && <RankIcon rank={rank} size={22} />}
        <CategoryIcon category={move.category} type={move.type} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-extrabold">{move.name}</span>
          {(acc || dmg) && (
            <span className="text-[13px] font-bold text-muted">
              {[acc, dmg].filter(Boolean).join(" · ")}
            </span>
          )}
          {extra}
        </span>
        <TypeBadge type={move.type} />
        <span
          className="grid h-7 min-w-11 flex-none place-items-center rounded-[9px] border-2 border-edge bg-surface px-1.5 text-[13px] font-extrabold"
          title="Potenza"
        >
          <span className="sr-only">Potenza </span>
          {move.power || "—"}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div id={panelId} className="xrow-det">
          <div className="kvs">
            <div className="kv">
              <span className="label-sm">Categoria</span>
              <b>{categoryLabel(move.category)}</b>
            </div>
            <div className="kv">
              <span className="label-sm">Potenza</span>
              <b>{move.power || "—"}</b>
            </div>
            <div className="kv">
              <span className="label-sm">Precisione</span>
              <b>{move.accuracy.join(" + ") || "—"}</b>
            </div>
            <div className="kv">
              <span className="label-sm">Danno</span>
              <b>
                {move.damage.length
                  ? [...move.damage, ...(move.power ? [String(move.power)] : [])].join(" + ")
                  : "—"}
              </b>
            </div>
            <div className="kv col-span-full">
              <span className="label-sm">Bersaglio</span>
              <b>{move.target || "—"}</b>
            </div>
          </div>
          {details ? (
            <>
              {details.effect && (
                <div className="kv">
                  <span className="label-sm">Effetto</span>
                  <span className="text-[15px] leading-snug">{details.effect}</span>
                </div>
              )}
              {details.description && (
                <p className="m-0 text-[15px] leading-snug text-muted italic">
                  {details.description}
                </p>
              )}
              {showLearners && details.learners && (
                <div className="kv gap-2">
                  <span className="label-sm">Chi la impara ({details.learners.length})</span>
                  {details.learners.length === 0 ? (
                    <span className="text-muted">Nessuna specie.</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {details.learners.map((l) => (
                        <Link key={l.speciesId} href={`/dex/${l.speciesId}`} className="who">
                          <RankIcon rank={l.rank} size={22} />
                          {l.name} <em>· {l.rank}</em>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : error ? (
            <p className="m-0 text-muted">Impossibile caricare i dettagli. Riprova.</p>
          ) : (
            <p className="m-0 text-muted">Caricamento…</p>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}
