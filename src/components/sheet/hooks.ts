"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/lib/actions/result";
import type { PlayState } from "@/lib/actions/schemas";
import type { SaveStatus } from "./SaveBar";

/**
 * Bozza della scheda: si salva solo con "Salva modifiche" (§9).
 * Avvisa il browser se si chiude la pagina con modifiche non salvate.
 */
export function useSheetDraft<T>(initial: T, save: (draft: T) => Promise<ActionResult>) {
  const [draft, setDraftState] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<string[]>([]);

  const setDraft = useCallback((update: (d: T) => T) => {
    setDraftState(update);
    setStatus("dirty");
  }, []);

  useEffect(() => {
    if (status !== "dirty" && status !== "error") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    setStatus("saving");
    const result = await save(draft);
    if (result.ok) {
      setStatus("saved");
      setError(null);
      // Il riepilogo di rank up/evoluzione resta fino al salvataggio successivo (§6.9).
      setChanges([]);
      return true;
    }
    setStatus("error");
    setError(result.error);
    return false;
  }, [draft, save]);

  /** Sostituisce la bozza con i dati del server (dopo rank up o evoluzione). */
  const replace = useCallback((next: T, summary?: string) => {
    setDraftState(next);
    setStatus("saved");
    setError(null);
    if (summary) setChanges((c) => [...c, summary]);
  }, []);

  return { draft, setDraft, status, error, changes, saveNow, replace, setError, setStatus };
}

export interface PlayValues {
  currentHp: number | null;
  currentWill: number | null;
  statuses: string[];
  locked: boolean;
}

/**
 * HP, Will, stati e lucchetto: aggiornamento ottimistico e salvataggio automatico
 * dopo ~400 ms dall'ultimo tocco (§9).
 */
export function usePlayState(
  initial: PlayValues,
  send: (patch: PlayState) => Promise<ActionResult>,
) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<PlayState>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const flush = useCallback(async () => {
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    const result = await sendRef.current(patch);
    setError(result.ok ? null : result.error);
  }, []);

  const update = useCallback(
    (patch: Partial<PlayValues>) => {
      setValues((v) => ({ ...v, ...patch }));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  // Se si lascia la pagina prima dei 400 ms, si invia subito.
  useEffect(() => {
    const onHide = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void flush();
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [flush]);

  /** Allinea ai dati del server (es. HP limitati dopo un'evoluzione). */
  const sync = useCallback((next: PlayValues) => setValues(next), []);

  /** Invia subito le modifiche in attesa (prima di un'azione che riscrive HP e stati). */
  const flushNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
  }, [flush]);

  return { values, update, error, sync, flushNow };
}
