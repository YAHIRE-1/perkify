import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/global/Logo";
import { LANDING_NAV_LINKS } from "@/config/marketing";


export default function Header() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Logo showText={true} />

        <nav className="nav-links">
          {LANDING_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="#coming-soon" className="nav-cta">
          Explore quests
        </Link>
        <Link href="#coming-soon" className="nav-cta-mobile">
          Explore
        </Link>
      </div>
    </header>
  );
}