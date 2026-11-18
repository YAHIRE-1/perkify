import { Translate } from '@/lib/i18n/provider';
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
              <Translate text={link.label} />
            </Link>
          ))}
        </nav>

        <Link href="#coming-soon" className="nav-cta"><Translate text={"Explore quests"} /></Link>
        <Link href="#coming-soon" className="nav-cta-mobile"><Translate text={"Explore"} /></Link>
      </div>
    </header>
  );
}