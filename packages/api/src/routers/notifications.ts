import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { notification, notificationEmail } from "@perkify/db/schema/notifications";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { o, protectedProcedure } from "../index";
import { renderNotificationEmail } from "../lib/notification-template";

const PAGE_SIZE = 20;
const CODE_TTL = 10 * 60_000;
const SEND_COOLDOWN = 30_000;
const MAX_ATTEMPTS = 5;
const CODE_VERSION = "v2:";
const hashCode = (secret: string, userId: string, address: string, expiresAt: Date, code: string) =>
  createHmac("sha256", secret)
    .update(JSON.stringify(["notification-email-verification", userId, address, expiresAt.getTime(), code]))
    .digest();

export const notificationsRouter = o.prefix("/notifications").tag("Notifications").router({
  list: protectedProcedure.route({ method: "GET", path: "/" })
    .input(z.object({ page: z.number().int().min(1).max(10_000).default(1) }))
    .handler(async ({ input, context }) => {
      const rows = await context.db.select({
        id: notification.id,
        questId: notification.questId,
        questTitle: notification.questTitle,
        kind: notification.kind,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      }).from(notification)
        .where(eq(notification.recipientId, context.session.user.id))
        .orderBy(desc(notification.createdAt), desc(notification.id))
        .offset((input.page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE + 1);
      return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
    }),

  unread: protectedProcedure.route({ method: "GET", path: "/unread" }).handler(async ({ context }) => {
    const [row] = await context.db.select({ total: count() }).from(notification)
      .where(and(eq(notification.recipientId, context.session.user.id), isNull(notification.readAt)));
    return row?.total ?? 0;
  }),

  markRead: protectedProcedure.route({ method: "POST", path: "/read" })
    .input(z.object({ id: z.string().uuid().optional() }))
    .handler(async ({ input, context }) => {
      await context.db.update(notification).set({ readAt: new Date() }).where(and(
        eq(notification.recipientId, context.session.user.id),
        isNull(notification.readAt),
        input.id ? eq(notification.id, input.id) : undefined,
      ));
    }),

  emailSettings: protectedProcedure.route({ method: "GET", path: "/email" }).handler(async ({ context }) => {
    const [row] = await context.db.select({
      address: notificationEmail.address,
      enabled: notificationEmail.enabled,
      pendingAddress: notificationEmail.pendingAddress,
      requestedAt: notificationEmail.requestedAt,
    }).from(notificationEmail).where(eq(notificationEmail.userId, context.session.user.id));
    return {
      address: row?.address ?? null,
      enabled: row?.enabled ?? false,
      pendingAddress: row?.address ? null : (row?.pendingAddress ?? null),
      resendAvailableAt: row?.requestedAt
        ? new Date(row.requestedAt.getTime() + SEND_COOLDOWN)
        : null,
      available: !!context.notificationMailer,
    };
  }),

  requestEmailCode: protectedProcedure.route({ method: "POST", path: "/email/request-code" })
    .input(z.object({ address: z.string().trim().max(254).toLowerCase().pipe(z.email()) }))
    .handler(async ({ input, context }) => {
      const send = context.notificationMailer;
      if (!send) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Email delivery is currently unavailable." });
      }
      const userId = context.session.user.id;
      const sent = await context.db.transaction(async (tx) => {
        await tx.insert(notificationEmail).values({ userId }).onConflictDoNothing();
        const [row] = await tx.select().from(notificationEmail)
          .where(eq(notificationEmail.userId, userId)).for("update");
        const now = Date.now();
        if (row?.requestedAt && now - row.requestedAt.getTime() < SEND_COOLDOWN) {
          throw new ORPCError("TOO_MANY_REQUESTS", { message: "Wait 30 seconds between verification code requests." });
        }
        if (row?.address) {
          throw new ORPCError("CONFLICT", { message: "Your account already has a verified notification email." });
        }

        const code = String(randomInt(10_000)).padStart(4, "0");
        const expiresAt = new Date(now + CODE_TTL);
        const heading = "Your Perkify verification code";
        try {
          await send({
            to: input.address,
            subject: heading,
            ...renderNotificationEmail({
              heading,
              body: "Enter this code in your Perkify profile to verify your email address. It expires in 10 minutes.",
              code,
              action: {
                label: "Open email preferences",
                href: new URL("/profile#email-notifications", context.notificationWebOrigin).href,
              },
              footnote: "If you did not request this code, you can ignore this email.",
            }),
          });
        } catch {
          await tx.update(notificationEmail).set({ requestedAt: new Date(now) })
            .where(eq(notificationEmail.userId, userId));
          return false;
        }

        await tx.update(notificationEmail).set({
          pendingAddress: input.address,
          codeHash: CODE_VERSION + hashCode(
            context.notificationCodeSecret, userId, input.address, expiresAt, code,
          ).toString("hex"),
          requestedAt: new Date(now),
          expiresAt,
          verificationAttempts: 0,
        }).where(eq(notificationEmail.userId, userId));
        return true;
      });
      if (!sent) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Could not send the verification code. Try again shortly." });
      }
    }),

  verifyEmail: protectedProcedure.route({ method: "POST", path: "/email/verify" })
    .input(z.object({ code: z.string().trim().regex(/^\d{4}$/, "Enter the four-digit code.") }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const result = await context.db.transaction(async (tx) => {
        const [row] = await tx.select().from(notificationEmail)
          .where(eq(notificationEmail.userId, userId)).for("update");
        if (row?.address) {
          throw new ORPCError("CONFLICT", { message: "Your account already has a verified notification email." });
        }
        if (!row?.codeHash?.startsWith(CODE_VERSION) || !row.pendingAddress || !row.expiresAt || row.expiresAt.getTime() <= Date.now()
          || row.verificationAttempts >= MAX_ATTEMPTS) return "expired";

        const expected = Buffer.from(row.codeHash.slice(CODE_VERSION.length), "hex");
        const actual = hashCode(context.notificationCodeSecret, userId, row.pendingAddress, row.expiresAt, input.code);
        if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) {
          await tx.update(notificationEmail).set({ verificationAttempts: row.verificationAttempts + 1 })
            .where(eq(notificationEmail.userId, userId));
          return row.verificationAttempts + 1 === MAX_ATTEMPTS ? "expired" : "invalid";
        }

        await tx.update(notificationEmail).set({
          address: row.pendingAddress,
          enabled: false,
          enabledAt: null,
          pendingAddress: null,
          codeHash: null,
          expiresAt: null,
          verificationAttempts: 0,
        }).where(eq(notificationEmail.userId, userId));
        return "verified";
      });

      if (result !== "verified") {
        throw new ORPCError("BAD_REQUEST", { message: result === "invalid"
          ? "That code is incorrect."
          : "This code is no longer valid. Request a new one." });
      }
    }),

  setEmailEnabled: protectedProcedure.route({ method: "POST", path: "/email/preference" })
    .input(z.object({ enabled: z.boolean() }))
    .handler(async ({ input, context }) => {
      if (input.enabled && !context.notificationMailer) {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Email delivery is currently unavailable." });
      }
      await context.db.transaction(async (tx) => {
        const userId = context.session.user.id;
        const [row] = await tx.select().from(notificationEmail)
          .where(eq(notificationEmail.userId, userId)).for("update");
        if (input.enabled && !row?.address) {
          throw new ORPCError("BAD_REQUEST", { message: "Verify an email address first." });
        }
        if (row && row.enabled !== input.enabled) {
          await tx.update(notificationEmail)
            .set({ enabled: input.enabled, enabledAt: input.enabled ? new Date() : null })
            .where(eq(notificationEmail.userId, userId));
        }
      });
    }),
});
