"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Stato dei form di accesso: i valori tornano indietro per non far riscrivere tutto (§14.5). */
export interface AuthFormState {
  error?: string;
  username: string;
  invite: string;
}

const HOME = "/pokemon/miei";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_.-]{3,24}$/,
    "Il nome utente deve avere da 3 a 24 caratteri: lettere, numeri, _ . -",
  );

const registerSchema = z.object({
  username: usernameSchema,
  password: z
    .string()
    .min(6, "La password deve avere almeno 6 caratteri")
    .max(200, "La password è troppo lunga"),
  invite: z.string().trim(),
});

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function signInOrError(username: string, password: string): Promise<string | null> {
  try {
    await signIn("credentials", { username, password, redirectTo: HOME });
    return null;
  } catch (error) {
    // Il redirect di successo è un'eccezione di Next: va rilanciata.
    if (error instanceof AuthError) return "Nome utente o password non corretti";
    throw error;
  }
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = field(formData, "username").trim().toLowerCase();
  const password = field(formData, "password");
  const state = { username, invite: "" };
  if (!username || !password) return { ...state, error: "Inserisci nome utente e password" };
  const error = await signInOrError(username, password);
  return { ...state, error: error ?? undefined };
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    username: field(formData, "username"),
    password: field(formData, "password"),
    invite: field(formData, "invite"),
  };
  const state = { username: raw.username.trim().toLowerCase(), invite: raw.invite.trim() };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ...state, error: parsed.error.issues[0].message };
  const { username, password, invite } = parsed.data;

  const expected = process.env.INVITE_CODE?.trim();
  if (expected && invite.toLowerCase() !== expected.toLowerCase()) {
    return { ...state, error: "Codice invito non valido" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) return { ...state, error: "Questo nome utente è già in uso" };

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await db
    .insert(users)
    .values({ username, passwordHash })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (inserted.length === 0) return { ...state, error: "Questo nome utente è già in uso" };

  const error = await signInOrError(username, password);
  return { ...state, error: error ?? undefined };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
