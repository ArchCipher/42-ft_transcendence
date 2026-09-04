import "./Register.css";
import RegisterForm from "./register-form";
import AppBackground from "@/components/AppBackground";

export default async function Register(){
   return (
    <AppBackground>
      <div className="RegisterPage">
        <Header />
        <RegisterForm />
      </div>
    </AppBackground>
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

