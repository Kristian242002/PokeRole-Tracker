import Link from "next/link";
import { SideNav } from "@/components/SideNav";
import { TabBar } from "@/components/TabBar";

/** Guscio dell'app: barra laterale su desktop, barra in basso su telefono. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // L'account arriva con l'autenticazione (Fase 1).
  const account = (
    <Link href="/login" className="side-link">
      Accedi
    </Link>
  );
  return (
    <div className="flex min-h-dvh">
      <SideNav account={account} />
      <div className="flex min-w-0 flex-1 flex-col pb-[88px] lg:pb-0">{children}</div>
      <TabBar />
    </div>
  );
}
