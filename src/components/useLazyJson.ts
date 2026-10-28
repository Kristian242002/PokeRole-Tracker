"use client";

import { useCallback, useState } from "react";

const cache = new Map<string, Promise<unknown>>();

/**
 * Dati JSON scaricati solo al primo bisogno (es. al focus di una ricerca) e tenuti in memoria
 * per le pagine successive: le schede restano leggere (§16, velocità su telefono).
 */
export function useLazyJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async (): Promise<T | null> => {
    let request = cache.get(url) as Promise<T> | undefined;
    if (!request) {
      request = fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<T>;
      });
      cache.set(url, request);
    }
    try {
      const value = await request;
      setData(value);
      setError(false);
      return value;
    } catch {
      cache.delete(url);
      setError(true);
      return null;
    }
  }, [url]);
  return { data, error, load };
}
