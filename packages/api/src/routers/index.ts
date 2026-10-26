import type {
  InferRouterInputs,
  InferRouterOutputs,
  RouterClient,
} from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { questsRouter } from "./quests";
import { tokensRouter } from "./tokens";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  quests: questsRouter,
  tokens: tokensRouter,
};

export type AppRouter = typeof appRouter;

export type AppRouterClient = RouterClient<typeof appRouter>;
export type AppRouterInputs = InferRouterInputs<AppRouter>;
export type AppRouterOutputs = InferRouterOutputs<AppRouter>;

