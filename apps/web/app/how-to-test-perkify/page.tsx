import type { Metadata } from "next";
import Link from "next/link";
import LanguageSelect from "@/components/global/LanguageSelect";
import { Translate } from "@/lib/i18n/provider";

export const metadata: Metadata = {
  alternates: { canonical: "/how-to-test-perkify" },
  title: "How to Test Perkify",
  description:
    "Set up your wallet and complete your first test quest on Perkify.",
};

export default function HowToTestPerkifyPage() {
  return (
    <article className="mx-auto max-w-2xl py-8 sm:py-14">
      <div className="mb-6 flex justify-end">
        <LanguageSelect />
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
        <Translate text={"How to test"} />{" "}
        <span className="text-[var(--accent-text)]">Perkify</span>
      </h1>
      <p className="sub">
        <Translate text={"On Perkify, you can publish or complete quests, submit evidence, and earn rewards. This guide walks you through the process on the Ethereum Sepolia testnet."} />
      </p>

      <section className="mt-10" aria-labelledby="test-steps">
        <div className="section-head">
          <h2 id="test-steps"><Translate text={"Before you begin"} /></h2>
        </div>
        <ol className="flow" role="list">
          <li className="flow-step">
            <span className="flow-index" aria-hidden="true">
              01
            </span>
            <div className="flow-body">
              <h3><Translate text={"Set up your wallet"} /></h3>
              <p>
                <Translate text={"Open MetaMask and select Ethereum Sepolia in the network picker. If it does not appear, turn on the option to show test networks."} />
              </p>
            </div>
          </li>
          <li className="flow-step">
            <span className="flow-index" aria-hidden="true">
              02
            </span>
            <div className="flow-body">
              <h3><Translate text={"Get test tokens"} /></h3>
              <p>
                <Translate text={"Use your public wallet address to request Sepolia ETH for network fees. If you plan to fund a quest with USDC, also request test USDC on Ethereum Sepolia."} />
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--accent-text)]">
                <li>
                  <a
                    className="underline underline-offset-4"
                    href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                  >
                    <Translate text={"Test ETH from Google Cloud"} />
                  </a>
                </li>
                <li>
                  <a
                    className="underline underline-offset-4"
                    href="https://faucet.circle.com/"
                  >
                    <Translate text={"Test USDC from Circle"} />
                  </a>
                </li>
              </ul>
              <p className="mt-3">
                <Translate text={"Test tokens have no monetary value."} />
              </p>
            </div>
          </li>
          <li className="flow-step">
            <span className="flow-index" aria-hidden="true">
              03
            </span>
            <div className="flow-body">
              <h3><Translate text={"Try a quest"} /></h3>
              <p>
                <Translate text={"Connect your wallet in the dashboard. Choose a quest, complete its objective, and submit evidence for review. To test as a creator, post and fund a quest, review the submission, and release the reward after you approve it."} />
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="feedback">
        <div className="section-head">
          <h2 id="feedback"><Translate text={"Tell us how it went"} /></h2>
          <p>
            <Translate text={"If you find a bug, share which step you were on and what you expected to happen. Suggestions are welcome too."} />
          </p>
        </div>
        <Link href="/dashboard" className="btn-primary">
          <Translate text={"Try Perkify"} />
        </Link>
      </section>
    </article>
  );
}
