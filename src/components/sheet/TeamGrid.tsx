"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderPokemon, type TeamLayout } from "@/lib/actions/pokemon";
import { TEAM_SIZE } from "@/lib/rules";
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
  inBox: boolean;
}

type Group = keyof TeamLayout;
const GROUPS: Group[] = ["team", "box"];
const GROUP_LABEL: Record<Group, string> = { team: "nella squadra", box: "nel box" };
const isGroup = (id: UniqueIdentifier): id is Group => GROUPS.includes(id as Group);

const layoutOf = (team: TeamMember[]): TeamLayout => ({
  team: team.filter((p) => !p.inBox).map((p) => p.id),
  box: team.filter((p) => p.inBox).map((p) => p.id),
});
const sameLayout = (a: TeamLayout, b: TeamLayout) =>
  a.team.join(",") === b.team.join(",") && a.box.join(",") === b.box.join(",");

/**
 * Squadra (al massimo TEAM_SIZE) e Box dell'allenatore (Fasi 9 e 10), con riordino a
 * trascinamento anche da un gruppo all'altro. Mouse: trascina; telefono: tieni premuto
 * ~250 ms (il tocco breve apre la scheda, lo scroll resta libero); tastiera: spazio per
 * prendere, frecce, spazio per lasciare. Aggiornamento ottimistico, con ritorno all'ordine
 * precedente se il salvataggio fallisce.
 */
export function TeamGrid({
  trainerId,
  team,
  sortable,
  empty,
  children,
}: {
  trainerId: string;
  team: TeamMember[];
  /** Falso a scheda bloccata e nella vista in sola lettura del master. */
  sortable: boolean;
  /** Testo quando l'allenatore non ha Pokémon. */
  empty: string;
  /** Mostrato tra la squadra e il box ("Aggiungi Pokémon"). */
  children?: ReactNode;
}) {
  const [layout, setLayout] = useState(() => layoutOf(team));
  // Se cambia la squadra dal server (nuovo Pokémon, ricarica), si riparte dal suo ordine.
  const teamKey = team.map((p) => `${p.id}${p.inBox ? "b" : ""}`).join(",");
  const [syncedKey, setSyncedKey] = useState(teamKey);
  if (teamKey !== syncedKey) {
    setSyncedKey(teamKey);
    setLayout(layoutOf(team));
  }
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [, startSaving] = useTransition();
  const before = useRef(layout);
  const justDragged = useRef(false);
  const areaRef = useRef<HTMLDivElement>(null);
  // Al rilascio il browser genera un clic sul link trascinato: dnd-kit ne ferma la propagazione
  // (React non lo vede) ma non la navigazione. Questo ascoltatore, registrato prima del suo,
  // annulla solo il clic che chiude un trascinamento.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!justDragged.current) return;
      justDragged.current = false;
      if (areaRef.current?.contains(e.target as Node)) e.preventDefault();
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
  const members = (group: Group) =>
    layout[group].map((id) => byId.get(id)).filter((p): p is TeamMember => !!p);
  const groupOf = (id: UniqueIdentifier): Group | undefined =>
    isGroup(id) ? id : GROUPS.find((g) => layout[g].includes(String(id)));
  const nameOf = (id: UniqueIdentifier) => byId.get(String(id))?.name ?? "Pokémon";
  const place = (id: UniqueIdentifier) => {
    const group = groupOf(id);
    if (!group) return "fuori dalla squadra";
    const list = layout[group];
    const index = isGroup(id) ? list.length : list.indexOf(String(id)) + 1;
    return `posizione ${Math.max(index, 1)} di ${Math.max(list.length, 1)} ${GROUP_LABEL[group]}`;
  };

  // Prima un box (o una squadra) vuoto sotto il puntatore, poi il Pokémon più vicino.
  const collisionDetection: CollisionDetection = (args) => {
    const groups = args.droppableContainers.filter((c) => isGroup(c.id));
    const items = args.droppableContainers.filter((c) => !isGroup(c.id));
    const hits = (args.pointerCoordinates ? pointerWithin : rectIntersection)({
      ...args,
      droppableContainers: groups,
    });
    const emptyGroup = hits.find((h) => layout[h.id as Group].length === 0);
    if (emptyGroup) return [emptyGroup];
    return closestCenter({ ...args, droppableContainers: items });
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Invio resta per aprire la scheda: si prende e si lascia con lo spazio.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  // Passaggio da un gruppo all'altro durante il trascinamento (la squadra piena non accetta).
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = groupOf(active.id);
    const to = groupOf(over.id);
    if (!from || !to || from === to) return;
    if (to === "team" && layout.team.length >= TEAM_SIZE) {
      setFull(true);
      return;
    }
    const id = String(active.id);
    const target = layout[to];
    const index = isGroup(over.id) ? target.length : target.indexOf(String(over.id));
    setLayout({
      ...layout,
      [from]: layout[from].filter((x) => x !== id),
      [to]: [...target.slice(0, index), id, ...target.slice(index)],
    } as TeamLayout);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setFull(false);
    const previous = before.current;
    let next = layout;
    const group = groupOf(active.id);
    if (over && group && groupOf(over.id) === group && !isGroup(over.id)) {
      const list = layout[group];
      next = {
        ...layout,
        [group]: arrayMove(list, list.indexOf(String(active.id)), list.indexOf(String(over.id))),
      } as TeamLayout;
    }
    if (sameLayout(next, previous)) {
      setLayout(previous);
      return;
    }
    setLayout(next);
    setError(null);
    startSaving(async () => {
      const result = await reorderPokemon(trainerId, next);
      if (!result.ok) {
        setLayout(previous);
        setError(`Ordine non salvato: ${result.error}`);
      }
    });
  }

  const squad = members("team");
  const box = members("box");
  const showBox = box.length > 0 || (sortable && squad.length > 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="h2">Squadra</h2>
        <span className="cnt" aria-label={`${squad.length} su ${TEAM_SIZE}`}>
          {squad.length}/{TEAM_SIZE}
        </span>
      </div>
      {team.length === 0 && <p className="m-0 text-muted">{empty}</p>}
      {sortable && team.length > 1}
      <div ref={areaRef} className="contents">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={() => {
            // Il clic che il browser genera al rilascio non deve aprire la scheda.
            justDragged.current = true;
            before.current = layout;
            setError(null);
          }}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setFull(false);
            setLayout(before.current);
          }}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Per spostare il Pokémon premi spazio, usa le frecce per scegliere il posto (anche nel box) e premi di nuovo spazio per lasciarlo. Esc annulla.",
            },
            announcements: {
              onDragStart: ({ active }) => `Hai preso ${nameOf(active.id)}, ${place(active.id)}.`,
              onDragOver: ({ active, over }) =>
                over
                  ? `${nameOf(active.id)} sopra la ${place(over.id)}.`
                  : `${nameOf(active.id)} è fuori dalla squadra.`,
              onDragEnd: ({ active, over }) =>
                over
                  ? `${nameOf(active.id)} lasciato in ${place(over.id)}.`
                  : `${nameOf(active.id)} lasciato al suo posto.`,
              onDragCancel: ({ active }) =>
                `Spostamento annullato: ${nameOf(active.id)} torna al suo posto.`,
            },
          }}
        >
          <GroupList
            group="team"
            label="Squadra"
            members={squad}
            sortable={sortable}
            ready={ready}
          />
          {full && (
            <p className="form-error text-sm" role="status">
              La squadra è piena ({TEAM_SIZE} Pokémon): sposta prima un Pokémon nel box.
            </p>
          )}
          {children}
          {showBox && (
            <>
              <div className="flex items-center justify-between border-t-2 border-line pt-3">
                <h3 className="h2">Box</h3>
                <span className="cnt">{box.length}</span>
              </div>
              <GroupList group="box" label="Box" members={box} sortable={sortable} ready={ready}>
                {box.length === 0 && (
                  <li className="col-span-2 rounded-[14px] border-2 border-dashed border-edge p-4 text-center text-[13px] font-bold text-muted">
                    Box vuoto: trascina qui i Pokémon da tenere da parte.
                  </li>
                )}
              </GroupList>
            </>
          )}
        </DndContext>
      </div>
      {error && (
        <p className="form-error text-sm" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function GroupList({
  group,
  label,
  members,
  sortable,
  ready,
  children,
}: {
  group: Group;
  label: string;
  members: TeamMember[];
  sortable: boolean;
  ready: boolean;
  children?: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: group, disabled: !sortable });
  return (
    <SortableContext items={members.map((p) => p.id)} strategy={rectSortingStrategy}>
      <ul
        ref={setNodeRef}
        className="grid min-h-4 grid-cols-2 gap-2.5"
        aria-label={label}
        data-ready={ready || undefined}
      >
        {members.map((p) => (
          <SortableCard key={p.id} member={p} sortable={sortable} />
        ))}
        {children}
      </ul>
    </SortableContext>
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
