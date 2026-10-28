import { currentUser } from "@/auth";
import { AccountLink } from "@/components/AccountLink";
import { SideNav } from "@/components/SideNav";
import { TabBar } from "@/components/TabBar";

/** Guscio dell'app: barra laterale su desktop, barra in basso su telefono. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="flex min-h-dvh">
      <a href="#contenuto" className="skip-link">
        Salta al contenuto
      </a>
      <SideNav account={<AccountLink username={user?.username ?? null} className="side-link" />} />
      <div
        id="contenuto"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col pb-[88px] outline-none lg:pb-0"
      >
        {children}
      </div>
      <TabBar />
    </div>
  );
}
