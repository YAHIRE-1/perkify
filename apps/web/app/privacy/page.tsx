import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/global/LegalDocument";

export const metadata: Metadata = {
  title: "Perkify Privacy Notice",
  description: "How Perkify uses wallet, account, quest, and blockchain data.",
};

const sections = [
  {
    title: "Who to contact",
    text: "This notice describes the handling of personal data for Perkify (perkify.lat). The privacy contact is contact@perkify.lat.",
  },
  {
    title: "Information used to operate Perkify",
    text: "When you sign in, Perkify processes your public wallet address, selected network, and signed login message to verify control of your wallet and create a session. Perkify may process profile details you provide, an email address if supplied, quest activity, submitted evidence, and support messages. Session and security systems may use technical information such as IP address and browser details. Wallet recovery phrases and private keys are never needed to sign in.",
  },
  {
    title: "Purposes and legal grounds",
    text: "Perkify uses data to authenticate users, operate quests and rewards, let authorized parties review evidence, handle disputes, respond to requests, and protect the platform. Where applicable law requires a legal basis, processing may be necessary to provide the service or comply with legal duties, justified by legitimate security and fraud-prevention interests where those interests do not override your rights, or based on consent where required.",
  },
  {
    title: "Public blockchain records",
    text: "Blockchain transactions can make wallet addresses, amounts, transaction identifiers, and contract activity publicly visible. Public records may be linked with other information and may remain accessible indefinitely. Perkify cannot erase records from a public blockchain. Keep sensitive personal data out of on-chain fields and submit only the evidence necessary for a quest.",
  },
  {
    title: "Sharing and international processing",
    text: "Profile details and public quest activity may be visible to other users. Quest evidence is available to the participant and the creator handling the submission through the review tools. Information may also be handled by hosting, storage, email, blockchain infrastructure, and dispute service providers, or disclosed when required by law. Wallets and external dispute services may have their own notices. Data may be processed in other countries. Where applicable law requires transfer safeguards, those requirements apply.",
  },
  {
    title: "Cookies, retention, and choices",
    text: "Perkify uses a session cookie to keep you signed in and browser storage to remember preferences such as language and theme. Off-chain data may be kept for the time needed to operate your account, resolve quests and disputes, meet legal obligations, or preserve security records. You can sign out, clear local browser data, and manage available email preferences in the platform. Clearing browser data does not delete account or blockchain records.",
  },
  {
    title: "Your privacy rights",
    text: "Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, or object to processing, receive a copy of your data in a portable format, withdraw consent, or complain to a competent authority. Email the privacy contact to exercise a right. Perkify may verify that the request relates to you. Do not send a recovery phrase or private key.",
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Notice" sections={sections}>
      <p>For privacy questions or requests, contact <a href="mailto:contact@perkify.lat">contact@perkify.lat</a>.</p>
      <Link href="/terms">Read the Terms of Service</Link>
    </LegalDocument>
  );
}
