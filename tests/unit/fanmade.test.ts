import { describe, expect, it } from "vitest";
import {
  buildFanmade,
  emptyFanmadeInput,
  fanmadeToInput,
  type FanmadeContext,
  type FanmadeInput,
} from "@/lib/fanmade";

const ctx: FanmadeContext = {
  officialAbility: (n) => ({ "punk rock": "Punk Rock", static: "Static" })[n.trim().toLowerCase()],
  officialMove: (n) =>
    ({ "thunder shock": "Thunder Shock", growl: "Growl", boomburst: "Boomburst" })[
      n.trim().toLowerCase()
    ],
  species: (n) => ({ pikachu: { id: "pikachu", name: "Pikachu" } })[n.trim().toLowerCase()],
};

function shakkin(patch: Partial<FanmadeInput> = {}): FanmadeInput {
  return {
    ...emptyFanmadeInput(),
    name: "Shakkin",
    types: ["Normal", "Electric"],
    abilities: [
      { name: "punk rock", effect: "" },
      { name: "Feedback", effect: "Quando subisce un colpo sonoro, +1 Special." },
    ],
    moves: [
      { rank: "Rookie", name: "boomburst" },
      { rank: "Starter", name: "Thunder Shock" },
      { rank: "Starter", name: "thunder shock" },
    ],
    ...patch,
  };
}

describe("buildFanmade", () => {
  it("normalizza abilità e mosse ufficiali e salva le abilità nuove con effetto", () => {
    const r = buildFanmade(shakkin(), ctx);
    if (!r.ok) throw new Error(r.error);
    expect(r.name).toBe("Shakkin");
    expect(r.data.types).toEqual(["Normal", "Electric"]);
    expect(r.data.abilities).toEqual(["Punk Rock", "Feedback"]);
    expect(r.data.customAbilities).toEqual([
      { name: "Feedback", effect: "Quando subisce un colpo sonoro, +1 Special." },
    ]);
    expect(r.data.moves).toEqual([
      { rank: "Starter", name: "Thunder Shock" },
      { rank: "Rookie", name: "Boomburst" },
    ]);
    expect(r.data.number).toBe(0);
  });

  it("abilità nuova senza effetto → errore", () => {
    const r = buildFanmade(shakkin({ hiddenAbility: { name: "Rumore Bianco", effect: "" } }), ctx);
    expect(r).toEqual({ ok: false, error: 'Abilità nuova "Rumore Bianco": scrivi l\'effetto' });
  });

  it("serve almeno un'abilità", () => {
    const r = buildFanmade(shakkin({ abilities: [{ name: "", effect: "" }] }), ctx);
    expect(r).toEqual({ ok: false, error: "Serve almeno l'abilità 1" });
  });

  it("mossa non ufficiale → errore", () => {
    const r = buildFanmade(shakkin({ moves: [{ rank: "Starter", name: "Mossa Inventata" }] }), ctx);
    expect(r).toEqual({ ok: false, error: "Mossa sconosciuta: Mossa Inventata" });
  });

  it("base sopra il massimo → errore", () => {
    const input = shakkin();
    input.attributes = { ...input.attributes, strength: [4, 3] };
    expect(buildFanmade(input, ctx)).toEqual({
      ok: false,
      error: "Strength: la base (4) supera il massimo (3)",
    });
  });

  it("valida nome, tipi e link dell'immagine", () => {
    expect(buildFanmade(shakkin({ name: "  " }), ctx)).toEqual({
      ok: false,
      error: "Il nome è obbligatorio",
    });
    expect(buildFanmade(shakkin({ types: ["Fire", "Fire"] }), ctx)).toEqual({
      ok: false,
      error: "I due tipi devono essere diversi",
    });
    expect(buildFanmade(shakkin({ image: "http://esempio.it/a.png" }), ctx)).toEqual({
      ok: false,
      error: "L'immagine deve essere un link https",
    });
  });

  it("evoluzioni: risolve la specie di arrivo e rifiuta quelle sconosciute", () => {
    const ok = buildFanmade(
      shakkin({ evolutions: [{ to: "pikachu", kind: "Stone", speed: "", item: "Thunder Stone" }] }),
      ctx,
    );
    if (!ok.ok) throw new Error(ok.error);
    expect(ok.data.evolutions).toEqual([
      { kind: "Stone", to: "Pikachu", toId: "pikachu", item: "Thunder Stone" },
    ]);
    const bad = buildFanmade(
      shakkin({ evolutions: [{ to: "Nessuno", kind: "Level", speed: "Fast", item: "" }] }),
      ctx,
    );
    expect(bad).toEqual({ ok: false, error: "Specie di arrivo sconosciuta: Nessuno" });
  });

  it("fanmadeToInput ricostruisce l'editor dai dati salvati", () => {
    const r = buildFanmade(shakkin(), ctx);
    if (!r.ok) throw new Error(r.error);
    const input = fanmadeToInput(r.name, false, r.data);
    expect(input.shared).toBe(false);
    expect(input.abilities[1]).toEqual({
      name: "Feedback",
      effect: "Quando subisce un colpo sonoro, +1 Special.",
    });
    expect(buildFanmade(input, ctx)).toEqual({ ...r, shared: false });
  });
});
