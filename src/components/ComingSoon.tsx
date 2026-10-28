import { requireUser } from "@/auth";
import { PageHeader } from "./PageHeader";

/** Sezione non ancora costruita: richiede comunque il login. */
export async function ComingSoon({ title, phase }: { title: string; phase: number }) {
  await requireUser();
  return (
    <>
      <PageHeader title={title} />
      <main className="p-4 lg:px-8">
        <p className="panel max-w-xl text-[15px] font-bold text-muted">
          Questa sezione arriva nella Fase {phase}. Intanto puoi consultare Pokédex, Mosse e
          Strumenti.
        </p>
      </main>
    </>
  );
}
