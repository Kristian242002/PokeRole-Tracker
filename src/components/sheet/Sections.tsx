"use client";

import Link from "next/link";
import {
  ATTRIBUTE_LABEL,
  SOCIAL_ATTRIBUTES,
  skillKey,
  type PokemonAttribute,
  type SkillGroup,
  type SocialAttribute,
} from "@/lib/rules";
import { DotScale } from "./DotScale";

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d={locked ? "M8 11V8a4 4 0 0 1 8 0v3" : "M8 11V8a4 4 0 0 1 7.5-2"} />
    </svg>
  );
}

/**
 * Testata della scheda: su telefono barra rossa con freccia, titolo e lucchetto;
 * su desktop percorso e lucchetto. Sotto, i salti rapidi alle sezioni.
 */
export function SheetTopBar({
  eyebrow,
  title,
  back,
  locked,
  readOnly,
  onToggleLock,
  jumps,
}: {
  eyebrow: string;
  title: string;
  back: { href: string; label: string; section: string };
  locked: boolean;
  readOnly: boolean;
  onToggleLock: () => void;
  jumps: { href: string; label: string }[];
}) {
  const lock = readOnly ? (
    <span className="tag tag-info">Sola lettura</span>
  ) : (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={locked}
      aria-label="Blocca le modifiche alla scheda"
      title={locked ? "Scheda bloccata: tocca per sbloccare" : "Blocca la scheda"}
      onClick={onToggleLock}
    >
      <LockIcon locked={locked} />
    </button>
  );
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b-[3px] border-edge bg-red py-2.5 pr-2 pl-1 text-white lg:hidden">
        <Link
          href={back.href}
          className="icon-btn text-white hover:text-white"
          aria-label={back.label}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-extrabold tracking-[0.06em] uppercase">{eyebrow}</span>
          <span className="truncate text-base font-extrabold">{title}</span>
        </div>
        <span className={locked ? "rounded-xl bg-accent-soft text-red" : ""}>{lock}</span>
      </header>
      <div className="hidden items-center gap-3 px-8 pt-5 lg:flex">
        <nav aria-label="Percorso" className="flex-1 text-sm font-extrabold text-muted">
          <Link href={back.href}>{back.section}</Link> › {title}
        </nav>
        <span className={locked ? "rounded-xl bg-accent-soft text-red" : ""}>{lock}</span>
      </div>
      <nav
        aria-label="Sezioni della scheda"
        className="flex gap-2 overflow-x-auto px-4 pt-3 lg:hidden"
      >
        {jumps.map((j) => (
          <a key={j.href} className="jump" href={j.href}>
            {j.label}
          </a>
        ))}
      </nav>
    </>
  );
}

function Budget({ left }: { left: number }) {
  return (
    <span className={`tag ${left === 0 ? "tag-ok" : "tag-warn"}`}>
      {left >= 0 ? `Da spendere: ${left}` : `Oltre il limite: ${-left}`}
    </span>
  );
}

export interface AttributeRow {
  key: PokemonAttribute;
  value: number;
  base: number;
  max: number;
}

export function AttributesCard({
  rows,
  slots,
  left,
  disabled,
  onChange,
  legend,
}: {
  rows: AttributeRow[];
  slots: number;
  left: number;
  disabled: boolean;
  onChange: (key: PokemonAttribute, value: number) => void;
  legend: boolean;
}) {
  return (
    <section id="attributi" className="panel scroll-mt-20 gap-1" aria-label="Attributi">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="h2">Attributi</h2>
        <Budget left={left} />
      </div>
      {rows.map((r) => {
        const label = ATTRIBUTE_LABEL[r.key];
        return (
          <div key={r.key} className="flex min-h-10 items-center gap-2">
            <div className="flex w-[92px] flex-none flex-col">
              <span className="text-[15px] font-bold">{label}</span>
              <span className="cnt" data-warn={r.value > r.max || r.value < r.base}>
                {r.value} / {r.max}
              </span>
            </div>
            <DotScale
              label={label}
              value={r.value}
              base={r.base}
              max={r.max}
              slots={slots}
              width={slots > 5 ? 24 : 30}
              disabled={disabled}
              onChange={(v) => onChange(r.key, v)}
            />
          </div>
        );
      })}
      {legend && (
        <div className="flex flex-wrap gap-3.5 border-t border-line pt-2 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-dot-base" />
            Base
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-dot-fill" />
            Investiti
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-dot-empty" />
            Fino al massimo
          </span>
        </div>
      )}
    </section>
  );
}

const SOCIAL_COLOR: Record<SocialAttribute, string> = {
  tough: "#d97706",
  cool: "#1d5fd1",
  beauty: "#0e9ab8",
  cute: "#db2777",
  clever: "#2f9e44",
};

export function SocialCard({
  values,
  left,
  max = 5,
  disabled,
  onChange,
}: {
  values: Record<SocialAttribute, number>;
  /** Punti sociali ancora da spendere per il rank. */
  left: number;
  /** 5, oppure 7 a Champion. */
  max?: number;
  disabled: boolean;
  onChange: (key: SocialAttribute, value: number) => void;
}) {
  return (
    <section className="panel gap-1" aria-label="Attributi sociali">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="h2">Attributi sociali</h2>
        <Budget left={left} />
      </div>
      {SOCIAL_ATTRIBUTES.map((key) => {
        const label = ATTRIBUTE_LABEL[key];
        return (
          <div key={key} className="flex min-h-10 items-center justify-between gap-2">
            <span
              className="soc"
              style={{ "--soc-color": SOCIAL_COLOR[key] } as React.CSSProperties}
            >
              <i aria-hidden="true" />
              {label}
            </span>
            <DotScale
              label={label}
              value={values[key]}
              base={1}
              max={max}
              slots={max}
              width={max > 5 ? 26 : 30}
              disabled={disabled}
              onChange={(v) => onChange(key, v)}
            />
            <span className="cnt w-10 text-right" data-warn={values[key] > max}>
              {values[key]} / {max}
            </span>
          </div>
        );
      })}
    </section>
  );
}

export function SkillsCard({
  groups,
  values,
  cap,
  rank,
  left,
  disabled,
  onChange,
}: {
  groups: SkillGroup[];
  values: Record<string, number>;
  cap: number;
  rank: string;
  left: number;
  disabled: boolean;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <section id="skill" className="panel scroll-mt-20 gap-1" aria-label="Skill">
      <div className="flex items-center justify-between gap-2">
        <h2 className="h2">Skill</h2>
        <Budget left={left} />
      </div>
      <span className="mb-1 text-[13px] text-muted">
        Massimo a {rank}: {cap} · i pallini tratteggiati sono sopra il massimo
      </span>
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col pt-2">
          <span className="label pb-0.5">{g.title}</span>
          {g.skills.map((name) => {
            const key = skillKey(name);
            const v = values[key] ?? 0;
            return (
              <div
                key={key}
                className="flex min-h-10 items-center justify-between gap-2 border-b border-line"
              >
                <span className="flex-1 text-[15px] font-bold">{name}</span>
                <DotScale
                  label={name}
                  value={v}
                  max={5}
                  cap={cap}
                  slots={5}
                  width={30}
                  disabled={disabled}
                  onChange={(nv) => onChange(key, nv)}
                />
                <span className="cnt w-10 text-right" data-warn={v > cap}>
                  {v} / {cap}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
