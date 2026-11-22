import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/global/LegalDocument";

export const metadata: Metadata = {
  title: "Perkify Terms of Service",
  description: "General terms for using the Perkify Web3 quest platform.",
};

const sections = [
  {
    title: "Using Perkify",
    text: "Perkify (perkify.lat) is a platform where creators publish quests and participants can complete them for rewards. Use it only if you can enter a binding agreement and your local law permits your participation. If you act for an organization, you must have authority to act for it.",
  },
  {
    title: "Quests, evidence, and rewards",
    text: "Creators are responsible for lawful quest requirements, clear review criteria, and any reward they commit to fund. Participants must submit accurate evidence they have the right to share. Rewards depend on the quest rules, funding, review, and the applicable smart contract. You retain ownership of your content and permit Perkify to display or share it as needed to operate the quest and handle disputes.",
  },
  {
    title: "Wallets, test networks, and transactions",
    text: "You control your wallet and are responsible for securing its keys and checking the network, recipient, amount, and permissions before approving a transaction. Sign-in uses a message signature. Funding and other on-chain actions may require separate approvals or network fees. Confirmed transactions generally cannot be reversed. Testnet tokens are for testing and have no monetary value. Smart contracts, networks, and third-party services can fail or become unavailable.",
  },
  {
    title: "Escrow and disputes",
    text: "Quest funds may be locked in a smart contract. The contract and quest rules determine when payment, refunds, or disputes are available. Where a quest uses a third-party dispute mechanism such as Kleros, review its rules, fees, deadlines, and evidence visibility before using it. These mechanisms do not remove any rights or remedies available to you under mandatory law.",
  },
  {
    title: "Acceptable use",
    text: "Do not use Perkify for fraud, phishing, unlawful activity, harassment, fabricated evidence, or unauthorized use of another person’s data or intellectual property. Perkify may remove unlawful or abusive content or restrict access where necessary to protect users or comply with law. Access restrictions do not themselves reverse blockchain transactions.",
  },
  {
    title: "Changes, rights, and applicable law",
    text: "Perkify may update the platform and these terms. Material changes will be communicated as required by applicable law. Your mandatory consumer protections and access to courts or regulators remain available. Applicable law and jurisdiction are determined under the rules that apply to your situation.",
  },
];

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" sections={sections}>
      <p>For questions about these terms, contact <a href="mailto:contact@perkify.lat">contact@perkify.lat</a>.</p>
      <Link href="/privacy">Read the Privacy Notice</Link>
    </LegalDocument>
  );
}
