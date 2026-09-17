import "../auth/auth.css";
import RegisterForm from "./register-form";
import AuthPageShell from "@/components/AuthPageShell";

export default async function Register() {
  return <AuthPageShell><RegisterForm /></AuthPageShell>;
}
