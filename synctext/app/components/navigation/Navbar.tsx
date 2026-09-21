import MobileMenu from "@/app/components/navigation/MobileMenu";

type NavbarProps = {
  children?: React.ReactNode;
  mobileMenu?: boolean;
};

export default function Navbar({ children,
                                  mobileMenu = true,
                                }: NavbarProps) {
  return (
    <header className="relative z-50 w-full border-b border-white/15">
      <nav
        aria-label="Main navigation"
        className="
                    flex min-h-20 
                    items-center 
                    justify-between 
                    px-5 
                    sm:px-[clamp(1.25rem,5vw,5rem)]"
      >
      {children && (
        <>
          <div
            className={
              mobileMenu
                ? "hidden min-[901px]:flex items-center gap-2 ml-auto"
                : "flex items-center gap-2 ml-auto"}>

            {children}
          </div>

          {mobileMenu ? (
            <div className="ml-auto min-[901px]:hidden">
              <MobileMenu>
                {children}
              </MobileMenu>
            </div>
          ) : null}
        </>
      )}
      </nav>
    </header>
  );
}