import Link from "next/link";
import { Logo } from "@/components/global/Logo";
import { LANDING_NAV_LINKS } from "@/config/marketing";

export default function LandingHeader() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        
        {/* Logo Global */}
        <Link href="/" className="logo">
          <Logo showText={true} />
        </Link>

        {/* Navegación específica de la Landing */}
        <nav className="nav-links">
          {LANDING_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTAs específicos de la Landing */}
        <div className="nav-actions">
          <Link href="#active" className="nav-cta hidden md:block">
            Explore quests
          </Link>
          <Link href="#active" className="nav-cta-mobile md:hidden">
            Explore
          </Link>
        </div>

      </div>
    </header>
  );
}
