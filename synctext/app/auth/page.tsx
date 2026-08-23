import "./Login.css";
import Image from "next/image";
import LoginForm from "./login-form";

export default function Login() {
  return <LoginPage />;
}

function LoginPage() {
  return (
    <div className="LoginPage">
      <Header />

      <LoginForm />

      <Image
        src="/assets/humma-kavula.png"
        alt="Humma Kavula"
        width={220}
        height={220}
        className="HummaBanner"
      />  
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
