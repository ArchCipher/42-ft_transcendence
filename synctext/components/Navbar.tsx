import Link from "next/link";
import { DisplayText } from "@/components/Typography";
import MobileMenu from "@/components/MobileMenu";

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
        <Link
          href="/"
          aria-label="SyncText home"
          className=" leading-none
                      text-[#f4f2ee]
                      no-underline
                      outline-none
                      focus-visible:ring-2
                      focus-visible:ring-white"
        >
        <DisplayText className="text-[clamp(3rem,4vw,4rem)] leading-none text-[#f4f2ee]">
          SyncText
        </DisplayText>  
        </Link>

        {children && (
          <>
            <div
              className={
                mobileMenu
                  ? "hidden min-[901px]:flex items-center gap-2"
                  : "flex items-center gap-2"}>

              {children}
            </div>

            {mobileMenu ? (
              <MobileMenu>
                {children}
              </MobileMenu>
            ) : null}
          </>
        )}
      </nav>
    </header>
  );
}