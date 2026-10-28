"use client";

import "./globals.css";

/** Errore nel guscio stesso dell'app (raro): pagina minima in italiano. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="it">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="h1">Qualcosa è andato storto</h1>
        <p className="m-0 max-w-md" role="alert">
          Il sito ha avuto un problema imprevisto. Riprova tra poco.
        </p>
        <button type="button" className="btn" onClick={reset}>
          Riprova
        </button>
      </body>
    </html>
  );
}
