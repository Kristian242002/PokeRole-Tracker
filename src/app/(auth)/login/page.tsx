import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return <AuthForm mode="login" inviteRequired={false} />;
}
