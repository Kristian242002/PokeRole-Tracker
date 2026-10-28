"use client";

import { useId, useMemo, useState } from "react";
import type { Item } from "@/lib/data-types";
import { Chevron } from "./Chevron";
import { ChipFilter, SearchField, normalize } from "./Filters";
import { PageHeader } from "./PageHeader";
import { Sprite } from "./Sprite";

const POCKETS: Record<string, { label: string; tint: string; ink: string }> = {
  HeldItems: { label: "Strumenti tenuti", tint: "#e1ecfc", ink: "#1f4e9e" },
  Medicine: { label: "Medicine", tint: "#dcf4e5", ink: "#1e7a46" },
  TrainerItems: { label: "Strumenti allenatore", tint: "#fff1c2", ink: "#6b4500" },
  Pokeballs: { label: "Poké Ball", tint: "#ffe1e5", ink: "#a81e2c" },
  EvolutionItem: { label: "Evolutivi", tint: "#e4e0ee", ink: "#4b3a7a" },
  TechnicalMachine: { label: "MT", tint: "#eef1f6", ink: "#4e5a75" },
};

const CATEGORY_LABEL: Record<string, string> = {
  MegaStone: "Megapietra",
  BattleItem: "Strumento da lotta",
  ZCrystal: "Cristallo Z",
  TypeBoosting: "Potenzia un tipo",
  Healing: "Cura",
  Berry: "Bacca",
  Status: "Cura stati",
  Vitamin: "Vitamina",
  MonBoosting: "Potenzia un Pokémon",
};

const POCKET_OPTIONS = [
  { value: "all", label: "Tutte le tasche" },
  ...Object.entries(POCKETS).map(([value, p]) => ({ value, label: p.label })),
];

export function pocketLabel(pocket: string): string {
  return POCKETS[pocket]?.label ?? pocket;
}

export function priceLabel(price: Item["price"]): string {
  return typeof price === "number" ? `${price.toLocaleString("it-IT")} ₽` : "Non in vendita";
}

function shortDescription(text: string): string {
  const first = text.split(/(?<=\.)\s/)[0];
  return first.length > 90 ? first.slice(0, 87).trimEnd() + "…" : first;
}

function show(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return Object.values(value).join(", ");
  return String(value);
}

/** Elenco degli strumenti con ricerca e filtro tasca (§10.4). */
export function ItemsBrowser({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [pocket, setPocket] = useState("all");

  const filtered = useMemo(() => {
    const q = normalize(query);
    return items.filter(
      (i) => (pocket === "all" || i.pocket === pocket) && (!q || normalize(i.name).includes(q)),
    );
  }, [items, query, pocket]);

  return (
    <>
      <PageHeader
        title="Strumenti"
        subtitle={`${filtered.length} di ${items.length} strumenti`}
        back={{ href: "/altro", label: "Torna al menu" }}
      >
        <SearchField
          id="items-q"
          label="Cerca strumento"
          value={query}
          onChange={setQuery}
          className="lg:w-[360px]"
        />
        <ChipFilter
          label="Filtra per tasca"
          options={POCKET_OPTIONS}
          value={pocket}
          onChange={setPocket}
        />
      </PageHeader>
      <main className="flex flex-col gap-2.5 p-4 lg:max-w-5xl lg:px-8 lg:pt-4 lg:pb-10">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-muted">Nessuno strumento trovato.</p>
        ) : (
          filtered.map((item) => <ItemRow key={item.id} item={item} />)
        )}
      </main>
    </>
  );
}

function ItemRow({ item }: { item: Item }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const pocket = POCKETS[item.pocket];
  const details: [string, string][] = [
    ["Tasca", pocketLabel(item.pocket)],
    ["Categoria", CATEGORY_LABEL[item.category] ?? item.category],
    ["Prezzo", priceLabel(item.price)],
    ["Monouso", item.oneUse ? "Sì" : "No"],
    ["Per il Pokémon", show(item.forPokemon)],
    ["Per il tipo", show(item.forTypes)],
    ["Potenziamento", [show(item.boost), show(item.value)].filter(Boolean).join(" +")],
    ["HP curati", show(item.healthRestored)],
    ["Stati curati", show(item.cures)],
  ];
  return (
    <div className="card overflow-hidden rounded-2xl shadow-[0_3px_0_var(--edge)]">
      <button
        type="button"
        className="xrow-btn min-h-16 gap-3"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="grid size-11 flex-none place-items-center rounded-xl border-2 border-edge"
          style={{
            background: pocket?.tint ?? "var(--mut-bg)",
            color: pocket?.ink ?? "var(--muted)",
          }}
        >
          <Sprite image={item.image} name={item.name} kind="item" size={32} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-extrabold">{item.name}</span>
          <span className="text-[13px] font-bold text-muted">
            {pocketLabel(item.pocket)}
            <span className="hidden sm:inline"> · {shortDescription(item.description)}</span>
          </span>
        </span>
        <span className="text-[15px] font-extrabold whitespace-nowrap">
          {priceLabel(item.price)}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div id={panelId} className="xrow-det mx-2.5 mb-2.5 bg-surface2">
          <div className="kv">
            <span className="label-sm">Descrizione</span>
            <span className="text-[15px] leading-snug">{item.description}</span>
          </div>
          <div className="kvs">
            {details
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="kv">
                  <span className="label-sm">{k}</span>
                  <b>{v}</b>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
