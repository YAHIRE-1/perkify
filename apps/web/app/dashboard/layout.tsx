import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Quest Marketplace | Perkify",
  description: "Browse quests on Perkify, submit proof of your work, and earn crypto rewards from escrow.",
  alternates: { canonical: "/dashboard" },
};

export default function marketplaceLayout({ children }: { children: ReactNode }) {
  return children;
}
