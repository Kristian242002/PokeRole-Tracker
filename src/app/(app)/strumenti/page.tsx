import type { Metadata } from "next";
import { ItemsBrowser } from "@/components/ItemsBrowser";
import { ITEMS } from "@/lib/data";

export const metadata: Metadata = { title: "Strumenti" };

export default function StrumentiPage() {
  return <ItemsBrowser items={ITEMS} />;
}
