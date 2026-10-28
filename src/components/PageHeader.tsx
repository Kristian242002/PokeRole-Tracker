import { LogoMark } from "./Logo";

/**
 * Intestazione di pagina: su telefono è la testata rossa fissa del design,
 * su desktop il titolo grande sopra il contenuto.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Contenuto extra della testata (ricerca, filtri). */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b-[3px] border-edge bg-red px-4 pt-4 pb-3.5 text-white lg:static lg:border-0 lg:bg-transparent lg:px-8 lg:pt-7 lg:pb-1 lg:text-ink">
      <div className="flex flex-wrap items-center gap-3 lg:items-end lg:gap-4">
        <span className="lg:hidden">
          <LogoMark size={56} />
        </span>
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
