import "./Forgot_password.css";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPassword() {
  return (
    <div className="FP_Page">
      <Header />
      <ForgotPasswordForm />
    </div>
  );
}

function Header() {
  return (
    <header className="Header">
      <div className="Brand">
        <div className="BrandNumber">42</div>

        <div className="BrandText">
          <h1>DON&apos;T PANIC</h1>
          <p>All the documents in the universe</p>
        </div>
      </div>
    </header>
  );
}

