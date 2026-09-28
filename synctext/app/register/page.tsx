import "../auth/auth.css";
import RegisterForm from "./register-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export default async function Register() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}
