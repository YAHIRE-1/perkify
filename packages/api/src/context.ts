import type { Auth } from "@perkify/auth";
import type { SupportedChainId } from "@perkify/contracts/addresses";
import type { Database } from "@perkify/db";
import type { PublicClient } from "viem";
import type { NotificationMailer } from "./lib/notification-mail";

export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export interface Context {
  session: Session;
  db: Database;
  notificationMailer: NotificationMailer | undefined;
  notificationWebOrigin: string;
  notificationCodeSecret: string;
  questTranslationApiKey: string | undefined;
  getPublicClient: (chainId: SupportedChainId) => PublicClient;
}
