import Link from "next/link";
import { LogoMark } from "./Logo";

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="icon-btn text-white hover:text-white" aria-label={label}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </Link>
  );
}

/**
 * Intestazione di pagina: su telefono è la testata rossa fissa del design,
 * su desktop il titolo grande sopra il contenuto.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Su telefono mostra la freccia indietro al posto del logo. */
  back?: { href: string; label: string };
  /** Contenuto extra della testata (ricerca, filtri). */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b-[3px] border-edge bg-red px-4 pt-4 pb-3.5 text-white lg:static lg:border-0 lg:bg-transparent lg:px-8 lg:pt-7 lg:pb-1 lg:text-ink">
      <div className="flex flex-wrap items-center gap-3 lg:items-end lg:gap-4">
        <span className="lg:hidden">{back ? <BackLink {...back} /> : <LogoMark size={56} />}</span>
        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
          <h1 className="h1">{title}</h1>
          {subtitle && (
            <span className="text-sm font-bold lg:text-[15px] lg:text-muted">{subtitle}</span>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/**
 * Intestazione delle schede di dettaglio: su telefono barra rossa compatta con freccia,
 * su desktop percorso ("Pokédex › Barboach") e azioni.
 */
export function DetailHeader({
  eyebrow,
  title,
  back,
  actions,
}: {
  eyebrow: string;
  title: string;
  back: { href: string; label: string; section: string };
  actions?: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b-[3px] border-edge bg-red py-2.5 pr-2 pl-1 text-white lg:hidden">
        <BackLink href={back.href} label={back.label} />
        <div className="flex flex-1 flex-col">
          <span className="text-[11px] font-extrabold tracking-[0.06em] uppercase">{eyebrow}</span>
          <span className="text-base font-extrabold">{title}</span>
        </div>
      </header>
      <div className="hidden flex-wrap items-center gap-3 px-8 pt-5 lg:flex">
        <nav aria-label="Percorso" className="flex-1 text-sm font-extrabold text-muted">
          <Link href={back.href}>{back.section}</Link> › {title}
        </nav>
        {actions}
      </div>
    </>
  );
}
