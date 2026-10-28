"use client";

import { useActionState } from "react";
import { createTrainer, type CreateTrainerState } from "@/lib/actions/trainers";

type CreateAction = (prev: CreateTrainerState, formData: FormData) => Promise<CreateTrainerState>;

/**
 * "Crea allenatore": nome → crea e apre la scheda (§10.5).
 * Con `action` crea invece un allenatore del master in una campagna.
 */
export function CreateTrainerForm({
  action: create = createTrainer,
  label = "Nuovo allenatore",
}: {
  action?: CreateAction;
  label?: string;
}) {
  const [state, action, pending] = useActionState<CreateTrainerState, FormData>(create, {
    name: "",
  });
  return (
    <form action={action} className="flex flex-col gap-2 lg:max-w-xl">
      <label htmlFor="new-trainer" className="label">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id="new-trainer"
          name="name"
          className="field flex-1"
          placeholder="Nome dell'allenatore"
          defaultValue={state.name}
          key={state.name + (state.error ?? "")}
          maxLength={60}
          required
        />
        <button type="submit" className="btn flex-none" disabled={pending}>
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
          Crea allenatore
        </button>
      </div>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
