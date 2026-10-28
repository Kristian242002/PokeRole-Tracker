import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = { title: "Pagina non trovata" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <NotFoundView />
    </div>
  );
}
