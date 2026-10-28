import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { LogoMark } from "@/components/Logo";

function Lights({ size }: { size: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1.5 pt-1">
      {["#ff8a8a", "#ffcc33", "#4cd07d"].map((c) => (
        <span
          key={c}
          className="rounded-full border-2 border-edge"
          style={{ width: size, height: size, background: c }}
        />
      ))}
    </span>
  );
}

/** Pagine di accesso: testata rossa con logo e riquadro del modulo (design 14). */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await currentUser()) redirect("/pokemon/miei");
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="flex flex-col items-center gap-3.5 border-b-[3px] border-edge bg-red px-6 pt-10 pb-16 text-center text-white lg:flex-1 lg:items-start lg:justify-center lg:gap-5 lg:border-r-[3px] lg:border-b-0 lg:px-16 lg:py-12 lg:text-left">
        <div className="flex items-start gap-2.5">
          <span className="lg:hidden">
            <LogoMark size={92} />
          </span>
          <span className="hidden lg:block">
            <LogoMark size={132} />
          </span>
          <Lights size={14} />
        </div>
        <p className="font-display text-4xl leading-none font-semibold lg:text-[56px]">
          Pokérole Tracker
        </p>
        <p className="max-w-[460px] text-base font-bold lg:text-xl lg:leading-snug">
          <span className="lg:hidden">Le schede della tua campagna, sempre in tasca.</span>
          <span className="hidden lg:inline">
            Schede di allenatori e Pokémon, Pokédex, mosse e strumenti della tua campagna di
            Pokérole 3.0.
          </span>
        </p>
      </div>
      <div className="flex flex-1 justify-center px-4 pb-6 lg:items-center lg:px-6 lg:py-12">
        <main className="-mt-10 flex w-full max-w-[440px] flex-col gap-4 self-start rounded-[22px] border-2 border-edge bg-surface p-5 shadow-[0_5px_0_var(--edge)] lg:mt-0 lg:self-center lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
