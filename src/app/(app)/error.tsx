"use client";

import Link from "next/link";

/** Errore imprevisto in una pagina dell'app: messaggio in italiano e "Riprova". */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="h1">Qualcosa è andato storto</h1>
      <p className="m-0 max-w-md text-[15px] text-muted" role="alert">
        Non sono riuscito a caricare questa pagina. Controlla la connessione e riprova; se il
        problema continua, ricarica la pagina.
        {error.digest && <span className="mt-2 block text-xs">Codice: {error.digest}</span>}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn" onClick={reset}>
          Riprova
        </button>
        <Link href="/pokemon/miei" className="btn btn-ghost">
          I miei Pokémon
        </Link>
      </div>
    </main>
  );
}
