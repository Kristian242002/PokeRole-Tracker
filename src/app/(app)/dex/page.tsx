import type { Metadata } from "next";
import { currentUser } from "@/auth";
import { DexBrowser } from "@/components/DexBrowser";
import { dexEntries } from "@/lib/dex";

export const metadata: Metadata = { title: "Pokédex" };

export default async function DexPage() {
  const user = await currentUser();
  return <DexBrowser entries={await dexEntries(user?.id ?? null)} />;
}
