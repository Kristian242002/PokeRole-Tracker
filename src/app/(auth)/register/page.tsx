import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Registrati" };

export default function RegisterPage() {
  return <AuthForm mode="register" inviteRequired={!!process.env.INVITE_CODE?.trim()} />;
}
