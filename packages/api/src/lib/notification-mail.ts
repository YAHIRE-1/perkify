import type { Database } from "@perkify/db";
import { notification, notificationEmail, type NotificationKind } from "@perkify/db/schema/notifications";
import { eq, lte } from "drizzle-orm";
import type { Tx } from "./participations";
import { renderNotificationEmail } from "./notification-template";

const subjects: Record<NotificationKind, string> = {
  DISPUTE_OPENED: "A participant opened a dispute",
  DISPUTE_PAID: "A dispute was resolved and the reward was paid",
  DISPUTE_REJECTED: "Your dispute was rejected",
  DISPUTE_CLOSED: "Your dispute was closed because the escrow was refunded",
  JOINED: "Someone joined your quest",
  SUBMITTED: "New evidence is ready to review",
  APPROVED: "Your submission was approved",
  REJECTED: "Your submission was rejected",
  CANCELLED: "Your quest was cancelled and refunded",
  EXPIRED_REFUND: "Your expired quest was refunded",
  QUEST_EXPIRED: "A quest you joined ended",
  DISPUTE_REFUND: "Your quest was refunded after dispute resolution",
};

export type NotificationMailer = (message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => Promise<void>;

export async function recordNotification(
  tx: Tx,
  recipientId: string,
  quest: { id: string; title: string },
  kind: NotificationKind,
) {
  const [settings] = await tx.select({
    address: notificationEmail.address,
    enabled: notificationEmail.enabled,
  }).from(notificationEmail).where(eq(notificationEmail.userId, recipientId));
  const emailAddress = settings?.enabled ? settings.address : null;
  const createdAt = new Date();

  await tx.insert(notification).values({
    recipientId,
    questId: quest.id,
    questTitle: quest.title,
    kind,
    createdAt,
    emailAddress,
    emailDueAt: emailAddress ? createdAt : null,
  });
}

export async function deliverNotificationEmails(db: Database, webOrigin: string, send: NotificationMailer) {
  for (let index = 0; index < 10; index++) {
    const processed = await db.transaction(async (tx) => {
      const now = new Date();
      const [item] = await tx.select().from(notification)
        .where(lte(notification.emailDueAt, now))
        .orderBy(notification.emailDueAt)
        .limit(1)
        .for("update", { skipLocked: true });
      if (!item) return false;

      const [settings] = await tx.select().from(notificationEmail)
        .where(eq(notificationEmail.userId, item.recipientId))
        .for("update");

      let nextAttempt: Date | null = null;
      let attempts = item.emailAttempts;
      // Do not send stale updates after a prolonged outage.
      const fresh = now.getTime() - item.createdAt.getTime() < 20 * 60 * 60 * 1000;
      if (fresh && item.emailAddress && settings?.enabled && settings.address === item.emailAddress
        && settings.enabledAt && settings.enabledAt <= item.createdAt) {
        attempts += 1;
        const link = new URL(`/quests/${item.questId}`, webOrigin).href;
        const preferences = new URL("/profile#email-notifications", webOrigin).href;
        try {
          await send({
            to: item.emailAddress,
            subject: subjects[item.kind],
            ...renderNotificationEmail({
              heading: subjects[item.kind],
              body: item.questTitle,
              action: { label: "View quest", href: link },
              footnote: "You enabled quest updates by email in Perkify.",
              preferencesHref: preferences,
            }),
          });
        } catch (error) {
          console.error("Notification email failed", item.id, error instanceof Error ? error.name : "Unknown error");
          if (attempts < 5) nextAttempt = new Date(now.getTime() + 60_000 * 2 ** (attempts - 1));
        }
      }

      await tx.update(notification)
        .set({ emailDueAt: nextAttempt, emailAttempts: attempts, emailAddress: nextAttempt ? item.emailAddress : null })
        .where(eq(notification.id, item.id));
      return true;
    });
    if (!processed) break;
  }
}
