/** Ritratto dell'allenatore; senza immagine mostra la sagoma del design. */
export function TrainerPortrait({
  image,
  name,
  className = "",
}: {
  image: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`grid flex-none place-items-center overflow-hidden rounded-2xl border-2 border-edge bg-surface2 ${className}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- immagine caricata dall'utente (Vercel Blob)
        <img src={image} alt={`Ritratto di ${name}`} className="size-full object-cover" />
      ) : (
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
          className="text-muted"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      )}
    </div>
  );
}
