import Link from "next/link";

/** 404 (§8): stesso messaggio per pagine inesistenti e per schede di altri utenti. */
export function NotFoundView() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="font-display text-6xl font-semibold text-muted" aria-hidden="true">
        404
      </span>
      <h1 className="h1">Pagina non trovata</h1>
      <p className="m-0 max-w-md text-[15px] text-muted">
        L&apos;indirizzo non esiste, oppure è una scheda che non puoi vedere (di un altro giocatore
        o di una campagna di cui non sei il master).
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/pokemon/miei" className="btn">
          I miei Pokémon
        </Link>
        <Link href="/dex" className="btn btn-ghost">
          Pokédex
        </Link>
      </div>
    </main>
  );
}
