import { defineRelationsPart } from "drizzle-orm";
import {
  quest,
  questMilestones,
  questParticipation,
  questSubmission,
  questEvidenceFile,
  user,
  tokens,
  authRelations,
  disputesRelations,
  transactionsRelations,
} from "./schema";

const questRelations = defineRelationsPart(
  {
    quest,
    questMilestones,
    questParticipation,
    questSubmission,
    questEvidenceFile,
    user,
    tokens,
  },
  (r) => ({
    quest: {
      creator: r.one.user({
        from: r.quest.creatorId,
        to: r.user.id,
        alias: "creator",
      }),
      token: r.one.tokens({
        from: r.quest.tokenId,
        to: r.tokens.id,
      }),
      milestones: r.many.questMilestones({
        from: r.quest.id,
        to: r.questMilestones.questId,
      }),
      participations: r.many.questParticipation({
        from: r.quest.id,
        to: r.questParticipation.questId,
      }),
    },
    questMilestones: {
      quest: r.one.quest({
        from: r.questMilestones.questId,
        to: r.quest.id,
      }),
    },
    questParticipation: {
      quest: r.one.quest({
        from: r.questParticipation.questId,
        to: r.quest.id,
      }),
      hunter: r.one.user({
        from: r.questParticipation.hunterId,
        to: r.user.id,
        alias: "hunter",
        optional: false,
      }),
      submissions: r.many.questSubmission({
        from: r.questParticipation.id,
        to: r.questSubmission.participationId,
      }),
    },
    questSubmission: {
      participation: r.one.questParticipation({
        from: r.questSubmission.participationId,
        to: r.questParticipation.id,
      }),
      files: r.many.questEvidenceFile({
        from: r.questSubmission.id,
        to: r.questEvidenceFile.submissionId,
      }),
    },
    questEvidenceFile: {
      submission: r.one.questSubmission({
        from: r.questEvidenceFile.submissionId,
        to: r.questSubmission.id,
      }),
    },
    user: {
      createdQuests: r.many.quest({
        from: r.user.id,
        to: r.quest.creatorId,
        alias: "creator",
      }),
      participations: r.many.questParticipation({
        from: r.user.id,
        to: r.questParticipation.hunterId,
        alias: "hunter",
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