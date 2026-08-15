import Link from "next/link";

import "./Login.css";

export default function Home() {
  return <MainPage />;
}

function MainPage() {
  return (
    <div className="MainPage">
      <Header />

      <LoginBox />

      <img
        src="/assets/humma-kavula.png"
        alt="Humma Kavula"
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
          <h1>DON'T PANIC</h1>
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

