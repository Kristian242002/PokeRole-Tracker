"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createPokemon } from "@/lib/actions/pokemon";

/** Pulsante "+" della scheda specie (§10.2): scegli un allenatore, crea il Pokémon e apri la scheda. */
export function AddToTrainer({
  speciesId,
  speciesName,
  trainers,
}: {
  speciesId: string;
  speciesName: string;
  trainers: { id: string; name: string }[];
}) {
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (trainers.length === 0) {
    return (
      <p className="m-0 text-sm font-bold text-muted">
        Per aggiungere {speciesName} <Link href="/allenatori">crea prima un allenatore</Link>.
      </p>
    );
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await createPokemon(trainerId, speciesId);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {trainers.length > 1 && (
          <>
            <label htmlFor="add-to-trainer" className="sr-only">
              Allenatore
            </label>
            <select
              id="add-to-trainer"
              className="sheet-field h-12 w-auto min-w-0 flex-1 border-2 border-edge bg-surface font-bold lg:flex-none"
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="button" className="btn" onClick={add} disabled={pending}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {trainers.length > 1 ? "Aggiungi" : `Aggiungi a ${trainers[0].name}`}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
