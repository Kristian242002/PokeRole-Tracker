import type { Metadata } from "next";
import { requireUser } from "@/auth";
import { FanmadeEditor } from "@/components/FanmadeEditor";
import { emptyFanmadeInput } from "@/lib/fanmade";
import { fanmadeEditorData } from "@/lib/fanmade-editor";

export const metadata: Metadata = { title: "Nuovo fanmade" };

export default async function NewFanmadePage() {
  const user = await requireUser();
  const data = await fanmadeEditorData(user.id);
  return <FanmadeEditor initial={emptyFanmadeInput()} userId={user.id} {...data} />;
}
