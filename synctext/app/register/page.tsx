import type { Metadata } from "next";
import "../auth/auth.css";
import RegisterForm from "./register-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export const metadata: Metadata = { title: "Sign up" };

export default async function Register() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}
