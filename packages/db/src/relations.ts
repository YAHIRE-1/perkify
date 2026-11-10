import { defineRelationsPart } from "drizzle-orm";

import { authRelations, user } from "./schema/auth";
import { disputes } from "./schema/disputes";
import { questEvidenceFile, questSubmission } from "./schema/evidence";
import { questParticipation } from "./schema/participations";
import { quest, questMilestones } from "./schema/quests";
import { tokens } from "./schema/tokens";
import { transactionsRelations } from "./schema/transactions";

const questRelations = defineRelationsPart(
  {
    quest,
    questMilestones,
    questParticipation,
    questSubmission,
    questEvidenceFile,
    disputes,
    user,
    tokens,
  },
  (r) => ({
    quest: {
      creator: r.one.user({
        from: r.quest.creatorId,
        to: r.user.id,
        alias: "creator",
        optional: false,
      }),
      token: r.one.tokens({
        from: r.quest.tokenId,
        to: r.tokens.id,
        optional: false,
      }),
      milestones: r.many.questMilestones({
        from: r.quest.id,
        to: r.questMilestones.questId,
      }),
      participations: r.many.questParticipation({
        from: r.quest.id,
        to: r.questParticipation.questId,
      }),
      disputes: r.many.disputes({
        from: r.quest.id,
        to: r.disputes.questId,
      }),
    },
    questMilestones: {
      quest: r.one.quest({
        from: r.questMilestones.questId,
        to: r.quest.id,
        optional: false,
      }),
    },
    questParticipation: {
      quest: r.one.quest({
        from: r.questParticipation.questId,
        to: r.quest.id,
        optional: false,
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
      disputes: r.many.disputes({
        from: r.questParticipation.id,
        to: r.disputes.participationId,
      }),
    },
    questSubmission: {
      participation: r.one.questParticipation({
        from: r.questSubmission.participationId,
        to: r.questParticipation.id,
        optional: false,
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
        optional: false,
      }),
    },
    disputes: {
      quest: r.one.quest({
        from: r.disputes.questId,
        to: r.quest.id,
        optional: false,
      }),
      participation: r.one.questParticipation({
        from: r.disputes.participationId,
        to: r.questParticipation.id,
        optional: false,
      }),
      // nullable: una disputa puede no tener un envío concreto
      submission: r.one.questSubmission({
        from: r.disputes.submissionId,
        to: r.questSubmission.id,
      }),
      opener: r.one.user({
        from: r.disputes.openedBy,
        to: r.user.id,
        alias: "disputeOpener",
        optional: false,
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
      openedDisputes: r.many.disputes({
        from: r.user.id,
        to: r.disputes.openedBy,
        alias: "disputeOpener",
      }),
    },
  }),
);

export const relations = {
  ...authRelations,
  ...questRelations,
  ...transactionsRelations,
};