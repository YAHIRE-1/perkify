import Link from "next/link";
import { Translate } from "@/lib/i18n/provider";
import Header from "@/components/header";
import ContractSection from "@/components/global/Contract";
import SocialSection from "@/components/global/SocialMedia";
import Footer from "@/components/global/Footer";
import { flowSteps } from "@/const/landing";
import TryPerkifySection from "@/components/global/TryPerkifySection";

export default function Home() {
  return (
    <>
      <Header />

      <div>
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <h1 className="headline">
                <span className="l1"><Translate text={"Do."} /></span>
                <span className="l2"><Translate text={"Prove."} /></span>
                <span className="l3"><Translate text={"Earn."} /></span>
              </h1>
              <p className="sub"><Translate text={"Perkify is a Web3 quest marketplace. Post a quest with a reward, or complete one and submit proof to claim it."} /></p>
              <div className="hero-ctas">
                <Link href="#try-perkify" className="btn-primary"><Translate text={"Try Perkify"} /></Link>
                <Link href="#how-it-works" className="btn-secondary"><Translate text={"How it works"} /></Link>
              </div>
            </div>
          </div>
        </section>
        <SocialSection />
        <ContractSection />

        {/* HOW IT WORKS */}
        <section className="section" id="how-it-works">
          <div className="wrap">
            <div className="section-head">
              <h2><Translate text={"From quest to your wallet, in four steps"} /></h2>
              <p><Translate text={"The same flow for any kind of quest, verified from start to finish."} /></p>
            </div>
            <div className="flow">
              {flowSteps.map((step, i) => (
                <div className="flow-step" key={step.title}>
                  <div className="flow-index">{String(i + 1).padStart(2, "0")}</div>
                  <div className="flow-body">
                    <h3><Translate text={step.title} /></h3>
                    <p><Translate text={step.desc} /></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DUAL CTA */}
        <section className="section" id="quest">
          <div className="wrap">
            <div className="dual">
              <div className="dual-card hunter">
                <div className="dual-tag"><Translate text={"FOR BOUNTY HUNTERS"} /></div>
                <h3><Translate text={"Complete quests and earn rewards"} /></h3>
                <p><Translate text={"Pick a quest, submit proof, and earn the reward when the creator approves your work."} /></p>
                <Link href="/how-to-test-perkify" className="dual-btn"><Translate text={"Start hunting"} /></Link>
              </div>
              <div className="dual-card brand">
                <div className="dual-tag"><Translate text={"FOR EVERYONE"} /></div>
                <h3><Translate text={"Post a quest and mobilize a community"} /></h3>
                <p><Translate text={"Set the objective, proof requirements, and reward. Review submissions and release the reward when you approve the work."} /></p>
                <Link href="/how-to-test-perkify" className="dual-btn"><Translate text={"Post a quest"} /></Link>
              </div>
            </div>
          </div>
        </section>

        <TryPerkifySection />
      </div>

      <Footer />
    </>
  );
}
