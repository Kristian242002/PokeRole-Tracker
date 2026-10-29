"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderPokemon } from "@/lib/actions/pokemon";
import { Sprite } from "../Sprite";
import { typeStyle } from "../TypeBadge";

export interface TeamMember {
  id: string;
  name: string;
  species: string;
  image: string;
  type: string;
  rank: string;
  hp: number;
  hpMax: number;
}

/**
 * "I suoi Pokémon" (Fase 9): riordino con trascinamento. Mouse: trascina; telefono: tieni
 * premuto ~250 ms (il tocco breve apre la scheda, lo scroll resta libero); tastiera: spazio per
 * prendere, frecce, spazio per lasciare. Aggiornamento ottimistico, con ritorno all'ordine
 * precedente se il salvataggio fallisce.
 */
export function TeamGrid({
  trainerId,
  team,
  sortable,
}: {
  trainerId: string;
  team: TeamMember[];
  /** Falso a scheda bloccata e nella vista in sola lettura del master. */
  sortable: boolean;
}) {
  const [order, setOrder] = useState(() => team.map((p) => p.id));
  // Se cambia la squadra dal server (nuovo Pokémon, ricarica), si riparte dal suo ordine.
  const teamKey = team.map((p) => p.id).join(",");
  const [syncedKey, setSyncedKey] = useState(teamKey);
  if (teamKey !== syncedKey) {
    setSyncedKey(teamKey);
    setOrder(team.map((p) => p.id));
  }
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();
  const justDragged = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  // Al rilascio il browser genera un clic sul link trascinato: dnd-kit ne ferma la propagazione
  // (React non lo vede) ma non la navigazione. Questo ascoltatore, registrato prima del suo,
  // annulla solo il clic che chiude un trascinamento.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!justDragged.current) return;
      justDragged.current = false;
      if (listRef.current?.contains(e.target as Node)) e.preventDefault();
    };
    const onPointerDown = () => (justDragged.current = false);
    window.addEventListener("click", onClick, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);
  // Vero solo nel browser dopo l'idratazione: prima un tocco è un semplice link.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const byId = new Map(team.map((p) => [p.id, p]));
  const items = order.map((id) => byId.get(id)).filter((p): p is TeamMember => !!p);
  const nameOf = (id: string | number) => byId.get(String(id))?.name ?? "Pokémon";
  const positionOf = (id: string | number) => order.indexOf(String(id)) + 1;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Invio resta per aprire la scheda: si prende e si lascia con lo spazio.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    setError(null);
    startSaving(async () => {
      const result = await reorderPokemon(trainerId, next);
      if (!result.ok) {
        setOrder(previous);
        setError(`Ordine non salvato: ${result.error}`);
      }
    });
  }

  return (
    <>
      {sortable && items.length > 1 }
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => {
          // Il clic che il browser genera al rilascio non deve aprire la scheda.
          justDragged.current = true;
        }}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Per spostare il Pokémon premi spazio, usa le frecce per scegliere il posto e premi di nuovo spazio per lasciarlo. Esc annulla.",
          },
          announcements: {
            onDragStart: ({ active }) =>
              `Hai preso ${nameOf(active.id)}, posizione ${positionOf(active.id)} di ${items.length}.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${nameOf(active.id)} sopra la posizione ${positionOf(over.id)} di ${items.length}.`
                : `${nameOf(active.id)} è fuori dalla squadra.`,
            onDragEnd: ({ active, over }) =>
              over
                ? `${nameOf(active.id)} lasciato in posizione ${positionOf(over.id)} di ${items.length}.`
                : `${nameOf(active.id)} lasciato al suo posto.`,
            onDragCancel: ({ active }) =>
              `Spostamento annullato: ${nameOf(active.id)} torna al suo posto.`,
          },
        }}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <ul
            ref={listRef}
            className="grid grid-cols-2 gap-2.5"
            aria-label="Squadra"
            data-ready={ready || undefined}
          >
            {items.map((p) => (
              <SortableCard key={p.id} member={p} sortable={sortable} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {error && (
        <p className="form-error text-sm" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function SortableCard({ member: p, sortable }: { member: TeamMember; sortable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
    disabled: !sortable,
    attributes: { roleDescription: "Pokémon riordinabile" },
  });
  // Il riquadro resta un link (niente role="button"): Invio apre la scheda.
  const { role: _role, ...linkAttributes } = attributes;
  void _role;
  const ratio = p.hpMax ? p.hp / p.hpMax : 0;

  return (
    <li
      ref={setNodeRef}
      className={isDragging ? "relative z-10" : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="team-member"
    >
      <Link
        href={`/pokemon/${p.id}`}
        className={`card flex h-full flex-col gap-2 rounded-[14px] p-3 shadow-[0_3px_0_var(--edge)] ${
          sortable ? "touch-manipulation select-none [-webkit-touch-callout:none]" : ""
        } ${isDragging ? "scale-[1.03] shadow-[0_8px_0_var(--edge)]" : ""}`}
        draggable={false}
        {...(sortable ? { ...linkAttributes, ...listeners } : {})}
      >
        <span className="flex items-center gap-2.5">
          <span
            className="tint grid size-11 flex-none place-items-center rounded-xl"
            style={typeStyle(p.type)}
          >
            <Sprite image={p.image} name={p.species} size={40} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-bold">{p.name}</span>
            <span className="truncate text-[13px] text-muted">{p.species}</span>
          </span>
        </span>
        <span className="flex items-center justify-between text-[13px] font-bold">
          <span>
            HP {p.hp}/{p.hpMax}
          </span>
          <span className="text-muted">{p.rank}</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-sm bg-dot-empty" aria-hidden="true">
          <span
            className="block h-1.5"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              background: ratio <= 0.25 ? "#e0412f" : ratio <= 0.5 ? "#f2b705" : "#2fb566",
            }}
          />
        </span>
      </Link>
    </li>
  );
}
