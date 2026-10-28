"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createCampaign,
  deleteCampaign,
  regenerateCode,
  removePlayer,
  sendPokemonTo,
  updateCampaign,
  type CampaignFormState,
} from "@/lib/actions/campaigns";

/** "Crea campagna" (§10.10). */
export function CreateCampaignForm() {
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(createCampaign, {
    name: "",
    description: "",
  });
  return (
    <form action={action} className="panel gap-2.5 lg:max-w-xl" aria-label="Crea campagna">
      <h2 className="h2">Crea campagna</h2>
      <label htmlFor="new-campaign" className="label">
        Nome
      </label>
      <input
        id="new-campaign"
        name="name"
        className="field"
        placeholder="es. La Lega del Lago Fosco"
        defaultValue={state.name}
        key={`n${state.name}${state.error ?? ""}`}
        maxLength={80}
        required
      />
      <label htmlFor="new-campaign-desc" className="label">
        Descrizione (facoltativa)
      </label>
      <textarea
        id="new-campaign-desc"
        name="description"
        className="sheet-field min-h-20"
        defaultValue={state.description}
        key={`d${state.description}${state.error ?? ""}`}
        maxLength={2000}
      />
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn self-start" disabled={pending}>
        + Crea campagna
      </button>
    </form>
  );
}

/** Codice da dare ai giocatori, con copia e "Rigenera". */
export function CampaignCode({ campaignId, code }: { campaignId: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copia non riuscita: selezionalo e copialo a mano");
    }
  }

  function regenerate() {
    if (
      !window.confirm(
        "Generare un nuovo codice? Quello attuale smetterà di funzionare (i giocatori già collegati restano).",
      )
    )
      return;
    start(async () => {
      const result = await regenerateCode(campaignId);
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <section className="warn-box gap-2 lg:flex-[2_1_420px]" aria-labelledby="camp-code">
      <span id="camp-code" className="label">
        Codice campagna
      </span>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span
          className="font-display text-4xl font-semibold tracking-[0.12em] select-all lg:text-[44px]"
          data-testid="join-code"
        >
          {code}
        </span>
        <span className="flex gap-2">
          <button type="button" className="btn h-11 px-3.5" onClick={() => void copy()}>
            {copied ? "Copiato!" : "Copia codice"}
          </button>
          <button
            type="button"
            className="btn btn-ghost h-11 px-3.5"
            onClick={regenerate}
            disabled={pending}
          >
            Rigenera
          </button>
        </span>
      </div>
      <span className="text-[15px] leading-snug">
        Dallo ai giocatori: lo inseriscono nel campo “Codice campagna” della scheda allenatore.
      </span>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** Nome e descrizione modificabili dal master. */
export function CampaignInfo({
  campaignId,
  name,
  description,
}: {
  campaignId: string;
  name: string;
  description: string;
}) {
  const [values, setValues] = useState({ name, description });
  const [saved, setSaved] = useState({ name, description });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = values.name !== saved.name || values.description !== saved.description;

  function save() {
    start(async () => {
      const result = await updateCampaign(campaignId, values);
      if (!result.ok) return setError(result.error);
      setError(null);
      setSaved(values);
    });
  }

  return (
    <section className="panel gap-2.5" aria-labelledby="camp-info">
      <h2 id="camp-info" className="h2">
        Campagna
      </h2>
      <label htmlFor="camp-name" className="label">
        Nome
      </label>
      <input
        id="camp-name"
        className="sheet-field"
        value={values.name}
        maxLength={80}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
      />
      <label htmlFor="camp-desc" className="label">
        Descrizione
      </label>
      <textarea
        id="camp-desc"
        className="sheet-field min-h-20"
        value={values.description}
        maxLength={2000}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn self-start" onClick={save} disabled={!dirty || pending}>
        {pending ? "Salvataggio…" : dirty ? "Salva" : "Salvato"}
      </button>
    </section>
  );
}

/** "Invia a…" su un Pokémon del master: scelta del giocatore, conferma, spostamento. */
export function SendToButton({
  pokemonId,
  pokemonName,
  players,
}: {
  pokemonId: string;
  pokemonName: string;
  players: { id: string; name: string; user: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(target: { id: string; name: string }) {
    if (!window.confirm(`Inviare ${pokemonName} a ${target.name}? Diventerà suo.`)) return;
    start(async () => {
      const result = await sendPokemonTo(pokemonId, target.id);
      if (!result.ok) return setError(result.error);
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        className="btn btn-ghost h-10 px-3 text-sm"
        aria-expanded={open}
        aria-label={`Invia ${pokemonName} a…`}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        Invia a…
      </button>
      {open && (
        <div
          role="group"
          aria-label={`A chi inviare ${pokemonName}`}
          className="flex w-full min-w-[220px] flex-col gap-1.5 rounded-[14px] border-2 border-edge bg-surface2 p-2.5"
        >
          <span className="label-sm">Scegli il giocatore</span>
          {players.length === 0 ? (
            <span className="text-sm text-muted">Nessun giocatore collegato.</span>
          ) : (
            players.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost h-11 justify-start text-sm"
                onClick={() => send(t)}
                disabled={pending}
              >
                {t.name} (@{t.user})
              </button>
            ))
          )}
        </div>
      )}
      {error && (
        <p className="form-error text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function RemovePlayerButton({
  campaignId,
  trainerId,
  trainerName,
}: {
  campaignId: string;
  trainerId: string;
  trainerName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost h-10 self-start px-3 text-sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Rimuovere ${trainerName} dalla campagna?`)) return;
          start(async () => {
            const result = await removePlayer(campaignId, trainerId);
            setError(result.ok ? null : result.error);
          });
        }}
      >
        Rimuovi dalla campagna
      </button>
      {error && (
        <p className="form-error text-sm" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function DeleteCampaignButton({ campaignId, name }: { campaignId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn btn-danger self-start"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Eliminare la campagna ${name}? I tuoi allenatori della campagna e i loro Pokémon verranno eliminati; i giocatori vengono scollegati.`,
            )
          )
            return;
          start(async () => {
            const result = await deleteCampaign(campaignId);
            if (result && !result.ok) setError(result.error);
          });
        }}
      >
        Elimina campagna
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
