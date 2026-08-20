import Link from "next/link";

import "./Login.css";
import Image from "next/image";

export default function Home() {
  return <MainPage />;
}

function MainPage() {
  return (
    <div className="MainPage">
      <Header />

      <LoginBox />

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

function LoginBox() {
  return (
    <div className="LoginBox">
      <h2>Access the Guide</h2>

      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />

      <Link href="/dashboard">
        <button>Access the Guide</button>
      </Link>
    </div>
  );
}

