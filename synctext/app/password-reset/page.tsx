import "./Password_reset.css";
import PasswordResetForm from "./password-reset-form";

export default async function PasswordReset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="PasswordResetPage">
      <Header />
      <PasswordResetForm token={token ?? ""} />
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

