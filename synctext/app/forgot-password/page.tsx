import "../auth/auth.css";
import ForgotPasswordForm from "./forgot-password-form";
import AuthPageShell from "@/app/components/auth/AuthPageShell";

export default function ForgotPassword() {
  return <AuthPageShell><ForgotPasswordForm /></AuthPageShell>;
}
