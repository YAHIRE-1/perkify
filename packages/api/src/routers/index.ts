import type {
  InferRouterInputs,
  InferRouterOutputs,
  RouterClient,
} from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { disputesRouter } from "./disputes";
import { reputationRouter } from "./reputation";
import { questsRouter } from "./quests";
import { notificationsRouter } from "./notifications";
import { tokensRouter } from "./tokens";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  quests: questsRouter,
  reputation: reputationRouter,
  disputes: disputesRouter,
  notifications: notificationsRouter,
  tokens: tokensRouter,
};

export type AppRouter = typeof appRouter;

export type AppRouterClient = RouterClient<typeof appRouter>;
export type AppRouterInputs = InferRouterInputs<AppRouter>;
export type AppRouterOutputs = InferRouterOutputs<AppRouter>;

