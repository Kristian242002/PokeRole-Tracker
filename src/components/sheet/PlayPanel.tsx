"use client";

import { useId, useState } from "react";
import { STATUSES, painPenalty } from "@/lib/rules";

function Meter({
  label,
  value,
  max,
  kind,
  onChange,
}: {
  label: "HP" | "Will";
  value: number;
  max: number;
  kind: "hp" | "will";
  onChange: (value: number) => void;
}) {
  const ratio = max > 0 ? value / max : 0;
  const on = kind === "will" ? "will" : ratio <= 0.25 ? "hp-low" : ratio <= 0.5 ? "hp-mid" : "hp";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="big-btn"
        aria-label={`Togli 1 ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <div className="flex flex-1 flex-col items-center gap-1.5">
        <span className="label">{label}</span>
        <span className="big-value" aria-live="polite" data-testid={`${kind}-value`}>
          {value}
          <span className="text-xl font-semibold text-muted"> / {max}</span>
        </span>
        <span className="flex w-full gap-[3px]" aria-hidden="true">
          {Array.from({ length: Math.min(max, 30) }, (_, i) => (
            <span key={i} className="seg" data-on={i < value ? on : undefined} />
          ))}
        </span>
      </div>
      <button
        type="button"
        className="big-btn"
        aria-label={`Aggiungi 1 ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

/** Parte "In gioco" (§9): HP, Will, stati, penalità. Sempre attiva, anche a scheda bloccata. */
export function PlayPanel({
  hp,
  hpMax,
  will,
  willMax,
  statuses,
  locked,
  readOnly,
  onHp,
  onWill,
  onStatuses,
  children,
}: {
  hp: number;
  hpMax: number;
  will: number;
  willMax: number;
  statuses: string[];
  locked: boolean;
  readOnly: boolean;
  onHp: (v: number) => void;
  onWill: (v: number) => void;
  onStatuses: (v: string[]) => void;
  /** Valori extra (Difesa, Iniziativa…). */
  children?: React.ReactNode;
}) {
  const pain = painPenalty(hp, hpMax);
  const infoId = useId();
  const [showInfo, setShowInfo] = useState(false);
  const toggle = (name: string) =>
    onStatuses(statuses.includes(name) ? statuses.filter((s) => s !== name) : [...statuses, name]);

  return (
    <section id="in-gioco" className="panel scroll-mt-20 gap-3.5" aria-label="In gioco">
      <div className="flex items-center justify-between">
        <h2 className="h2">In gioco</h2>
        {locked && <span className="tag tag-warn">Scheda bloccata</span>}
      </div>
      <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-3.5 border-0 p-0">
        <Meter label="HP" kind="hp" value={hp} max={hpMax} onChange={onHp} />
        <Meter label="Will" kind="will" value={will} max={willMax} onChange={onWill} />
        {pain !== 0 && (
          <p
            className="m-0 flex items-center gap-2.5 rounded-xl bg-warn-bg px-3 py-2.5 text-[15px] text-warn-ink shadow-[inset_0_0_0_1px_var(--warn-line)]"
            role="status"
          >
            {pain === "KO" ? (
              <strong>KO · 0 HP</strong>
            ) : (
              <span>
                <strong>Penalità da dolore {pain}</strong> ·{" "}
                {pain === 2 ? "HP a 1" : "HP a metà o meno"} (−{pain}{" "}
                {pain === 1 ? "successo" : "successi"} a tutti i tiri)
              </span>
            )}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <span className="label">Stati</span>
            <button
              type="button"
              className="info-btn size-9"
              aria-expanded={showInfo}
              aria-controls={infoId}
              aria-label="Mostra gli effetti degli stati"
              onClick={() => setShowInfo((s) => !s)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9.5" />
                <path d="M12 11v6M12 7.5v.5" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.name}
                type="button"
                className="status-chip"
                style={{ "--status-color": s.color } as React.CSSProperties}
                aria-pressed={statuses.includes(s.name)}
                title={s.effect}
                onClick={() => toggle(s.name)}
              >
                {s.name}
              </button>
            ))}
          </div>
          {showInfo && (
            <dl id={infoId} className="info-box m-0 grid gap-1 text-sm">
              {STATUSES.map((s) => (
                <div key={s.name}>
                  <dt className="inline font-extrabold">{s.name}: </dt>
                  <dd className="inline">{s.effect}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </fieldset>
      {children}
    </section>
  );
}
