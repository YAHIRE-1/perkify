import type { Auth } from "@perkify/auth";
import type { SupportedChainId } from "@perkify/contracts/addresses";
import type { Database } from "@perkify/db";
import type { PublicClient } from "viem";

export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export interface Context {
  session: Session;
  db: Database;
  getPublicClient: (chainId: SupportedChainId) => PublicClient;
}
