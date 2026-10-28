"use client";

import { useState, useTransition } from "react";
import { joinCampaign, leaveCampaign } from "@/lib/actions/trainers";

export type TrainerCampaign =
  /** Allenatore di un giocatore collegato (o no) a una campagna. */
  | { kind: "player"; linked: { name: string; master: string } | null }
  /** Allenatore del master in una campagna (NPC). */
  | { kind: "npc"; name: string };

/** "Codice campagna" della scheda allenatore (§10.6): campo + Collega / Scollega. */
export function CampaignField({
  trainerId,
  campaign,
  readOnly,
}: {
  trainerId: string;
  campaign: TrainerCampaign;
  readOnly: boolean;
}) {
  const [linked, setLinked] = useState(campaign.kind === "player" ? campaign.linked : null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (campaign.kind === "npc") {
    return (
      <section className="panel gap-2" aria-labelledby="t-campaign">
        <h2 id="t-campaign" className="h2">
          Campagna
        </h2>
        <p className="m-0 text-[15px]">
          Allenatore del master in <strong>{campaign.name}</strong>: lo vedi solo tu.
        </p>
      </section>
    );
  }

  function join() {
    start(async () => {
      const result = await joinCampaign(trainerId, code);
      if (!result.ok) return setError(result.error);
      setError(null);
      setCode("");
      setLinked(result.data);
    });
  }

  function leave() {
    if (!linked || !window.confirm(`Scollegare l'allenatore da ${linked.name}?`)) return;
    start(async () => {
      const result = await leaveCampaign(trainerId);
      if (!result.ok) return setError(result.error);
      setError(null);
      setLinked(null);
    });
  }

  return (
    <section className="panel gap-2" aria-labelledby="t-campaign">
      <label htmlFor="t-campaign-code" id="t-campaign" className="h2">
        Codice campagna
      </label>
      {linked ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="m-0 flex-1 text-[15px]" data-testid="campaign-linked">
            Collegato a <strong>{linked.name}</strong> · master @{linked.master}
          </p>
          {!readOnly && (
            <button
              type="button"
              className="btn btn-ghost h-11 px-3.5"
              onClick={leave}
              disabled={pending}
            >
              Scollega
            </button>
          )}
        </div>
      ) : readOnly ? (
        <p className="m-0 text-muted">Nessuna campagna.</p>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
          >
            <input
              id="t-campaign-code"
              className="sheet-field flex-1 font-bold tracking-[0.12em] uppercase"
              placeholder="Es. K7MQ2P"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
            />
            <button type="submit" className="btn h-11 px-4" disabled={pending || !code.trim()}>
              Collega
            </button>
          </form>
          <span className="text-[13px] text-muted">
            Te lo dà il master: il tuo allenatore e i suoi Pokémon diventano visibili a lui, in sola
            lettura.
          </span>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
