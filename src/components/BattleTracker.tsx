"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BattleCombatant } from "@/db/schema";
import { endBattle, saveBattle } from "@/lib/actions/battles";
import { MAX_COMBATANTS, setKo, sortByInitiative, type BattleState } from "@/lib/battle";
import type { Fighter } from "@/lib/battle-data";
import { STATUSES } from "@/lib/rules";
import { Sprite } from "./Sprite";
import { typeStyle } from "./TypeBadge";

type SaveState = "saved" | "saving" | "error";

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * Ordine di iniziativa (Fase 11): il master sceglie i Pokémon della campagna (solo quelli in
 * squadra) e chi non ha scheda, scrive l'iniziativa tirata al tavolo, ordina, sistema a mano con
 * il trascinamento; chi va KO esce dall'ordine. Salvataggio automatico dopo ~400 ms.
 */
export function BattleTracker({
  campaignId,
  fighters,
  initial,
}: {
  campaignId: string;
  fighters: Fighter[];
  initial: BattleState | null;
}) {
  const [battle, setBattle] = useState(initial);
  const [save, setSave] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (save === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  async function send(state: BattleState) {
    const result = await saveBattle(campaignId, state);
    if (latest.current !== state) return; // è già partito un salvataggio più recente
    setSave(result.ok ? "saved" : "error");
    setError(result.ok ? null : result.error);
  }

  /** Aggiorna subito la pagina e salva poco dopo l'ultimo cambiamento. */
  function change(next: BattleState, now = false) {
    setBattle(next);
    latest.current = next;
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    if (now) void send(next);
    else timer.current = setTimeout(() => void send(next), 400);
  }

  const byId = new Map(fighters.map((f) => [f.id, f]));
  const inBattle = new Set(battle?.combatants.map((c) => c.pokemonId) ?? []);
  const available = fighters.filter((f) => !f.inBox && !inBattle.has(f.id));

  function add(ids: string[], wild: string[]) {
    const added: BattleCombatant[] = [
      ...ids.map((id) => ({
        key: newKey(),
        pokemonId: id,
        name: byId.get(id)?.name ?? "Pokémon",
        initiative: null,
        ko: false,
      })),
      ...wild.map((name) => ({
        key: newKey(),
        pokemonId: null,
        name,
        initiative: null,
        ko: false,
      })),
    ];
    const current = battle?.combatants ?? [];
    // I nuovi in fondo all'ordine, prima dei KO.
    const combatants = [...current.filter((c) => !c.ko), ...added, ...current.filter((c) => c.ko)];
    change({ combatants }, true);
    setAdding(false);
  }

  function finish() {
    if (!window.confirm("Finire la battaglia? L'ordine di iniziativa viene cancellato.")) return;
    if (timer.current) clearTimeout(timer.current);
    start(async () => {
      const result = await endBattle(campaignId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBattle(null);
      latest.current = null;
      setSave("saved");
      setError(null);
    });
  }

  const status = (
    <>
      <span className="text-sm font-bold text-muted" role="status" data-testid="battle-save">
        {save === "saving" ? "Salvataggio…" : save === "saved" ? "Salvato" : ""}
      </span>
      {error && (
        <p className="form-error m-0 text-sm" role="alert">
          {error}
        </p>
      )}
    </>
  );

  if (!battle) {
    return (
      <section className="panel gap-3" aria-labelledby="pick-title">
        <h2 id="pick-title" className="h2">
          Chi combatte?
        </h2>
        <Picker fighters={available} onAdd={add} submit="Inizia battaglia" disabled={pending} />
        {status}
      </section>
    );
  }

  const list = battle.combatants;
  const active = list.filter((c) => !c.ko);
  const knockedOut = list.filter((c) => c.ko);
  const update = (key: string, patch: Partial<BattleCombatant>) =>
    change({ combatants: list.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  const remove = (key: string) => change({ combatants: list.filter((c) => c.key !== key) }, true);
  const ko = (key: string, value: boolean) => change({ combatants: setKo(list, key, value) }, true);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
      <div className="flex flex-col gap-4 lg:flex-[3_1_560px]">
        <section className="panel gap-3" aria-labelledby="order-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="order-title" className="h2">
              Ordine di iniziativa
            </h2>
            <button
              type="button"
              className="btn"
              disabled={active.length < 2}
              onClick={() => change({ combatants: sortByInitiative(list) }, true)}
            >
              Ordina per iniziativa
            </button>
          </div>
          {active.length === 0 && (
            <p className="m-0 text-muted">
              {list.length ? "Sono tutti KO." : "Nessun partecipante: aggiungine qui accanto."}
            </p>
          )}
          {active.length > 1 && (
            <p className="m-0 text-[13px] text-muted">
              Scrivi le iniziative e premi “Ordina per iniziativa”. Per sistemare a mano (pari
              merito, Quick Claw…) trascina la maniglia ⠿ (da tastiera: spazio e frecce).
            </p>
          )}
          <OrderList
            items={active}
            byId={byId}
            ready={ready}
            onReorder={(order) => change({ combatants: [...order, ...knockedOut] }, true)}
            onUpdate={update}
            onKo={(key) => ko(key, true)}
            onRemove={remove}
          />
          {status}
        </section>

        {knockedOut.length > 0 && (
          <section className="panel gap-3" aria-labelledby="ko-title">
            <div className="flex items-center justify-between">
              <h2 id="ko-title" className="h2">
                KO
              </h2>
              <span className="cnt">{knockedOut.length}</span>
            </div>
            <p className="m-0 text-[13px] text-muted">
              Fuori dall&apos;ordine. “Rientra” lo rimette in fondo all&apos;ordine.
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="KO">
              {knockedOut.map((c) => (
                <KoRow
                  key={c.key}
                  combatant={c}
                  fighter={c.pokemonId ? byId.get(c.pokemonId) : undefined}
                  onBack={() => ko(c.key, false)}
                  onRemove={() => remove(c.key)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:flex-[2_1_320px]">
        <section className="panel gap-3" aria-labelledby="add-title">
          <div className="flex items-center justify-between">
            <h2 id="add-title" className="h2">
              Partecipanti
            </h2>
            <span className="cnt">{list.length}</span>
          </div>
          {adding ? (
            <Picker
              fighters={available}
              onAdd={add}
              submit="Aggiungi"
              disabled={pending || list.length >= MAX_COMBATANTS}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              className="btn btn-ghost self-start"
              onClick={() => setAdding(true)}
            >
              Aggiungi partecipanti
            </button>
          )}
        </section>
        <button
          type="button"
          className="btn btn-danger self-start"
          onClick={finish}
          disabled={pending}
        >
          Fine battaglia
        </button>
      </aside>
    </div>
  );
}

/** Scelta dei Pokémon della campagna (solo squadra) e di partecipanti senza scheda. */
function Picker({
  fighters,
  onAdd,
  submit,
  disabled,
  onCancel,
}: {
  fighters: Fighter[];
  onAdd: (ids: string[], wild: string[]) => void;
  submit: string;
  disabled: boolean;
  onCancel?: () => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [wild, setWild] = useState<string[]>([]);
  const [wildName, setWildName] = useState("");
  const groups = new Map<string, Fighter[]>();
  for (const f of fighters) groups.set(f.trainerId, [...(groups.get(f.trainerId) ?? []), f]);
  const toggle = (id: string) =>
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const addWild = () => {
    const name = wildName.trim();
    if (!name) return;
    setWild((w) => [...w, name.slice(0, 60)]);
    setWildName("");
  };
  const count = chosen.size + wild.length;

  return (
    <div className="flex flex-col gap-3">
      {groups.size === 0 && (
        <p className="m-0 text-muted">
          Nessun Pokémon in squadra da aggiungere: quelli nel box non compaiono.
        </p>
      )}
      {[...groups.values()].map((members) => {
        const all = members.every((f) => chosen.has(f.id));
        return (
          <fieldset key={members[0].trainerId} className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 flex w-full items-center justify-between gap-2">
              <span className="font-extrabold">
                {members[0].trainer}{" "}
                <span className="text-[13px] text-muted">
                  {members[0].npc ? "· tuo" : "· giocatore"}
                </span>
              </span>
              <button
                type="button"
                className="text-[13px] font-extrabold"
                onClick={() =>
                  setChosen((s) => {
                    const next = new Set(s);
                    for (const f of members) {
                      if (all) next.delete(f.id);
                      else next.add(f.id);
                    }
                    return next;
                  })
                }
              >
                {all ? "Nessuno" : "Tutti"}
              </button>
            </legend>
            {members.map((f) => (
              <label
                key={f.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border-2 border-line bg-surface2 px-2.5 py-1.5"
              >
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--red)]"
                  checked={chosen.has(f.id)}
                  onChange={() => toggle(f.id)}
                />
                <span
                  className="tint grid size-8 flex-none place-items-center rounded-lg"
                  style={typeStyle(f.type)}
                >
                  <Sprite image={f.image} name={f.species} size={28} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{f.name}</span>
                  <span className="truncate text-[13px] text-muted">
                    Iniziativa 1d6 + {f.initiativeBase} · HP {f.hp}/{f.hpMax}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        );
      })}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="battle-wild" className="label">
          Senza scheda (es. un selvatico)
        </label>
        <div className="flex gap-2">
          <input
            id="battle-wild"
            className="field min-w-0 flex-1"
            value={wildName}
            maxLength={60}
            placeholder="Nome"
            onChange={(e) => setWildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addWild();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={addWild}
            disabled={!wildName.trim()}
          >
            Metti in lista
          </button>
        </div>
        {wild.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Senza scheda">
            {wild.map((name, i) => (
              <li key={`${name}-${i}`} className="tag tag-mut">
                {name}
                <button
                  type="button"
                  className="ml-1 font-extrabold"
                  aria-label={`Togli ${name}`}
                  onClick={() => setWild((w) => w.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          disabled={disabled || count === 0}
          onClick={() => {
            onAdd([...chosen], wild);
            setChosen(new Set());
            setWild([]);
          }}
        >
          {submit}
          {count > 0 ? ` (${count})` : ""}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annulla
          </button>
        )}
      </div>
    </div>
  );
}

function OrderList({
  items,
  byId,
  ready,
  onReorder,
  onUpdate,
  onKo,
  onRemove,
}: {
  /** Solo chi è in gioco (non KO), nell'ordine attuale. */
  items: BattleCombatant[];
  byId: Map<string, Fighter>;
  ready: boolean;
  onReorder: (order: BattleCombatant[]) => void;
  onUpdate: (key: string, patch: Partial<BattleCombatant>) => void;
  onKo: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const nameOf = (key: string | number) => items.find((c) => c.key === key)?.name ?? "Partecipante";
  const positionOf = (key: string | number) => items.findIndex((c) => c.key === key) + 1;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const keys = items.map((c) => c.key);
    onReorder(arrayMove(items, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Premi spazio per prendere, usa le frecce su e giù per scegliere il posto e premi di nuovo spazio per lasciarlo. Esc annulla.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Hai preso ${nameOf(active.id)}, posizione ${positionOf(active.id)} di ${items.length}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${nameOf(active.id)} sopra la posizione ${positionOf(over.id)} di ${items.length}.`
              : `${nameOf(active.id)} è fuori dalla lista.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `${nameOf(active.id)} lasciato in posizione ${positionOf(over.id)} di ${items.length}.`
              : `${nameOf(active.id)} lasciato al suo posto.`,
          onDragCancel: ({ active }) =>
            `Spostamento annullato: ${nameOf(active.id)} torna al suo posto.`,
        },
      }}
    >
      <SortableContext items={items.map((c) => c.key)} strategy={verticalListSortingStrategy}>
        <ol
          className="m-0 flex list-none flex-col gap-2 p-0"
          aria-label="Ordine di iniziativa"
          data-ready={ready || undefined}
        >
          {items.map((c, index) => (
            <Row
              key={c.key}
              combatant={c}
              position={index + 1}
              fighter={c.pokemonId ? byId.get(c.pokemonId) : undefined}
              onUpdate={(patch) => onUpdate(c.key, patch)}
              onKo={() => onKo(c.key)}
              onRemove={() => onRemove(c.key)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function Row({
  combatant: c,
  position,
  fighter: f,
  onUpdate,
  onKo,
  onRemove,
}: {
  combatant: BattleCombatant;
  position: number;
  fighter: Fighter | undefined;
  onUpdate: (patch: Partial<BattleCombatant>) => void;
  onKo: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: c.key });
  const name = f?.name ?? c.name;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="combatant"
      className={`flex flex-wrap items-center gap-2 rounded-[14px] border-2 border-edge bg-surface2 p-2 ${
        isDragging ? "relative z-10 shadow-[0_8px_0_var(--edge)]" : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="icon-btn size-9 cursor-grab touch-none text-lg"
        aria-label={`Sposta ${name}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="w-6 text-center font-display text-lg font-semibold" aria-hidden="true">
        {position}
      </span>
      <Identity combatant={c} fighter={f} />
      <span className="ml-auto flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          className="sheet-field w-16 text-center"
          aria-label={`Iniziativa di ${name}`}
          placeholder="—"
          min={-99}
          max={99}
          value={c.initiative ?? ""}
          onChange={(e) => {
            const value = e.target.value === "" ? null : Math.trunc(Number(e.target.value));
            if (value === null || (Number.isFinite(value) && Math.abs(value) <= 99)) {
              onUpdate({ initiative: value });
            }
          }}
        />
        <button
          type="button"
          className="btn btn-ghost h-9 px-2.5 text-sm"
          aria-label={`${name} KO`}
          onClick={onKo}
        >
          KO
        </button>
        <RemoveButton name={name} onRemove={onRemove} />
      </span>
    </li>
  );
}

/** Riga della zona KO: fuori dall'ordine, senza trascinamento. */
function KoRow({
  combatant: c,
  fighter: f,
  onBack,
  onRemove,
}: {
  combatant: BattleCombatant;
  fighter: Fighter | undefined;
  onBack: () => void;
  onRemove: () => void;
}) {
  const name = f?.name ?? c.name;
  return (
    <li
      data-testid="knocked-out"
      className="flex flex-wrap items-center gap-2 rounded-[14px] border-2 border-line bg-surface2 p-2"
    >
      <Identity combatant={c} fighter={f} dim />
      <span className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          className="btn btn-ghost h-9 px-2.5 text-sm"
          aria-label={`${name} rientra`}
          onClick={onBack}
        >
          Rientra
        </button>
        <RemoveButton name={name} onRemove={onRemove} />
      </span>
    </li>
  );
}

function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      className="icon-btn size-9 text-lg"
      aria-label={`Togli ${name} dalla battaglia`}
      onClick={onRemove}
    >
      ×
    </button>
  );
}

/** Immagine, nome (link alla scheda), allenatore, HP, base dell'iniziativa e stati. */
function Identity({
  combatant: c,
  fighter: f,
  dim = false,
}: {
  combatant: BattleCombatant;
  fighter?: Fighter;
  /** KO: immagine sbiadita (il testo resta leggibile). */
  dim?: boolean;
}) {
  const name = f?.name ?? c.name;
  const statuses = STATUSES.filter((s) => f?.statuses.includes(s.name));
  return (
    <>
      {f ? (
        <span
          className={`tint grid size-10 flex-none place-items-center rounded-xl ${dim ? "opacity-50 grayscale" : ""}`}
          style={typeStyle(f.type)}
        >
          <Sprite image={f.image} name={f.species} size={36} />
        </span>
      ) : (
        <span
          className="grid size-10 flex-none place-items-center rounded-xl border-2 border-dashed border-edge font-extrabold"
          aria-hidden="true"
        >
          ?
        </span>
      )}
      <span className="flex min-w-[140px] flex-1 flex-col">
        {f ? (
          <Link href={`/pokemon/${f.id}`} className="truncate font-extrabold">
            {name}
          </Link>
        ) : (
          <span className="truncate font-extrabold">{name}</span>
        )}
        <span className="truncate text-[13px] text-muted">
          {f ? `${f.trainer} · HP ${f.hp}/${f.hpMax} · base ${f.initiativeBase}` : "Senza scheda"}
        </span>
        {statuses.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {statuses.map((s) => (
              <span
                key={s.name}
                className="status-chip"
                style={{ "--status-color": s.color } as React.CSSProperties}
                data-active="true"
                title={s.effect}
              >
                {s.name}
              </span>
            ))}
          </span>
        )}
      </span>
    </>
  );
}
