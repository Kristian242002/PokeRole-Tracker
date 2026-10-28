import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = { title: "Pagina non trovata" };

/** 404 dentro l'app: con barra laterale e barra in basso. */
export default function NotFound() {
  return <NotFoundView />;
}
