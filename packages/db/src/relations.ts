import { defineRelationsPart } from "drizzle-orm";
import {
  quest,
  questMilestones,
  user,
  tokens,
  authRelations,
  disputesRelations,
  transactionsRelations,
} from "./schema";

const questRelations = defineRelationsPart(
  { quest, questMilestones, user, tokens },
  (r) => ({
    quest: {
      creator: r.one.user({
        from: r.quest.creatorId,
        to: r.user.id,
        alias: "creator",
      }),
      hunter: r.one.user({
        from: r.quest.hunterId,
        to: r.user.id,
        alias: "hunter",
        optional: true,
      }),
      token: r.one.tokens({
        from: r.quest.tokenId,
        to: r.tokens.id,
      }),
      milestones: r.many.questMilestones({
        from: r.quest.id,
        to: r.questMilestones.questId,
      }),
    },
    questMilestones: {
      quest: r.one.quest({
        from: r.questMilestones.questId,
        to: r.quest.id,
      }),
    },
  }),
);

export const relations = {
  ...authRelations,
  ...questRelations,
  ...disputesRelations,
  ...transactionsRelations,
};