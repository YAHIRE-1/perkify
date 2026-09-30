import Link from "next/link";
import { Logo } from "@/components/global/Logo";

export default function Footer() {
    return(
        <footer>
        <div className="wrap">
          <div className="footer-top">
            <Logo showText={true} />

            {/* <div className="footer-cols">
              <div className="footer-col">
                <h4>PRODUCT</h4>
                <Link href="#quests">Categories</Link>
                <Link href="#active">Active quests</Link>
                <Link href="#how-it-works">How it works</Link>
              </div>
              <div className="footer-col">
                <h4>HUNTERS</h4>
                <Link href="#">Hunter profile</Link>
                <Link href="#">Leaderboard</Link>
                <Link href="#">Quest log</Link>
              </div>
              <div className="footer-col">
                <h4>BRANDS</h4>
                <Link href="#brands">Post a quest</Link>
                <Link href="#">Pricing</Link>
                <Link href="#">Support</Link>
              </div>
            </div> */}
          </div>
          <div className="footer-bottom">
            <span>© 2026 Perkify. All rewards settle on-chain.</span>
            <span>Terms · Privacy</span>
          </div>
        </div>
      </footer>
    )
}