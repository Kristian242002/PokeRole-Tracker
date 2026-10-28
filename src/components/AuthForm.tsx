"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthFormState } from "@/lib/actions/account";

const INITIAL: AuthFormState = { username: "", invite: "" };

export function AuthForm({
  mode,
  inviteRequired,
}: {
  mode: "login" | "register";
  inviteRequired: boolean;
}) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState(isRegister ? register : login, INITIAL);
  // Dopo l'invio React azzera il form: la key forza i defaultValue restituiti dal server.
  const formKey = `${state.username}|${state.invite}|${state.error ?? ""}`;

  return (
    <>
      <h1 className="sr-only">{isRegister ? "Registrati" : "Accedi"}</h1>
      <nav className="segmented" aria-label="Accedi o registrati">
        <Link href="/login" aria-current={isRegister ? undefined : "page"}>
          Accedi
        </Link>
        <Link href="/register" aria-current={isRegister ? "page" : undefined}>
          Registrati
        </Link>
      </nav>
      <form key={formKey} action={action} className="flex flex-col gap-4" noValidate>
        <div className="form-field">
          <label className="label" htmlFor="username">
            Nome utente
          </label>
          <input
            id="username"
            name="username"
            className="field"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Es. kristian_x"
            defaultValue={state.username}
            required
          />
        </div>
        <div className="form-field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "Almeno 6 caratteri" : "La tua password"}
            required
          />
        </div>
        {isRegister && inviteRequired && (
          <div className="form-field">
            <label className="label" htmlFor="invite">
              Codice invito
            </label>
            <input
              id="invite"
              name="invite"
              className="field tracking-[0.06em] uppercase"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Te lo dà chi ha creato il gruppo"
              aria-describedby="invite-hint"
              defaultValue={state.invite}
              required
            />
            <span id="invite-hint" className="text-[13px] text-muted">
              Serve per entrare nel gruppo. Non è il codice campagna.
            </span>
          </div>
        )}
        {state.error && (
          <p id="auth-error" role="alert" className="form-error">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn h-[52px] w-full text-[17px]" disabled={pending}>
          {pending ? "Attendi…" : isRegister ? "Crea account" : "Entra"}
        </button>
      </form>
    </>
  );
}
