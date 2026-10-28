import Link from "next/link";
import { logout } from "@/lib/actions/account";

/** "Esci (nome utente)" se loggato, altrimenti "Accedi". */
export function AccountLink({
  username,
  className,
  children,
}: {
  username: string | null;
  className: string;
  /** Icona o contenuto prima dell'etichetta. */
  children?: React.ReactNode;
}) {
  if (!username) {
    return (
      <Link href="/login" className={className}>
        {children}
        <span className="flex-1">Accedi</span>
      </Link>
    );
  }
  return (
    <form action={logout}>
      <button
        type="submit"
        className={`${className} w-full cursor-pointer bg-transparent text-left`}
      >
        {children}
        <span className="flex-1">Esci ({username})</span>
      </button>
    </form>
  );
}
