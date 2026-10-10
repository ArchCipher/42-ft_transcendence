import MobileMenu from "@/app/components/navigation/MobileMenu";

type NavbarProps = {
  children?: React.ReactNode;
  brand?: React.ReactNode;
  mobileMenu?: boolean;
  className?: string;
  mobileChildren?: React.ReactNode,
};

export default function Navbar({ children,
                                  brand,
                                  mobileMenu = true,
                                  className = "",
                                  mobileChildren,
                                }: NavbarProps) {
  return (
    <header className={`relative z-[60] w-full border-b border-white/15 ${className}`}>
      <nav
        aria-label="Main navigation"
        className="
                    flex
                    items-center 
                    justify-between 
                    px-[var(--nav-x-padding)]"
      >
      {brand ? <div className="shrink-0">{brand}</div> : null}
      {children && (
        <>
          <div
            className={
              mobileMenu
                ? "hidden min-[901px]:flex min-w-0 items-center gap-2 ml-auto"
                : "flex min-w-0 items-center gap-2 ml-auto"}>

            {children}
          </div>

          {mobileMenu ? (
            <div className="ml-auto min-[901px]:hidden">
              <MobileMenu>
                {mobileChildren ?? children}
              </MobileMenu>
            </div>
          ) : null}
        </>
      )}
      </nav>
    </header>
  );
}
