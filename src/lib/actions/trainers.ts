"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import { ownedTrainer } from "@/lib/access";
import { defaultSocial, emptySkills } from "@/lib/rules";
import { LOCKED, NOT_FOUND, fail, ok, type ActionResult } from "./result";
import {
  playStateSchema,
  trainerNameSchema,
  trainerUpdateSchema,
  type PlayState,
  type TrainerUpdate,
} from "./schemas";

export interface CreateTrainerState {
  error?: string;
  name: string;
}

/** Crea un allenatore con il nome indicato e apre la sua scheda. */
export async function createTrainer(
  _prev: CreateTrainerState,
  formData: FormData,
): Promise<CreateTrainerState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const raw = String(formData.get("name") ?? "");
  const parsed = trainerNameSchema.safeParse(raw);
  if (!parsed.success) return { name: raw, error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(trainers)
    .values({
      userId: user.id,
      name: parsed.data,
      attributes: { strength: 1, dexterity: 1, vitality: 1, insight: 1 },
      social: defaultSocial(),
      skills: emptySkills("trainer"),
      statuses: [],
    })
    .returning({ id: trainers.id });
  revalidatePath("/allenatori");
  redirect(`/allenatori/${created.id}`);
}

export async function updateTrainer(id: string, input: TrainerUpdate): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const trainer = await ownedTrainer(id, user.id);
  if (!trainer) return fail(NOT_FOUND);
  if (trainer.locked) return fail(LOCKED);
  const parsed = trainerUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  await db.update(trainers).set(parsed.data).where(eq(trainers.id, id));
  revalidatePath(`/allenatori/${id}`);
  revalidatePath("/allenatori");
  return ok(undefined);
}

/** HP, Will, stati e lucchetto: salvati subito, anche a scheda bloccata (§9). */
export async function setTrainerPlayState(id: string, input: PlayState): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  if (!(await ownedTrainer(id, user.id))) return fail(NOT_FOUND);
  const parsed = playStateSchema.safeParse(input);
  if (!parsed.success) return fail("Valori non validi");
  if (Object.keys(parsed.data).length === 0) return ok(undefined);

  await db.update(trainers).set(parsed.data).where(eq(trainers.id, id));
  return ok(undefined);
}

export async function deleteTrainer(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  if (!(await ownedTrainer(id, user.id))) return fail(NOT_FOUND);
  await db.delete(trainers).where(eq(trainers.id, id));
  revalidatePath("/allenatori");
  revalidatePath("/pokemon/miei");
  redirect("/allenatori");
}
