import { user } from "@perkify/db/schema/auth";
import { questParticipation } from "@perkify/db/schema/participations";
import { asc, count, eq, lte, or, sql } from "drizzle-orm";
import { o, publicProcedure } from "../index";

const PERKYS_PER_QUEST = 100;
const LEADERBOARD_SIZE = 20;

export const reputationRouter = o.prefix("/reputation").tag("Reputation").router({
  leaderboard: publicProcedure.route({ method: "GET", path: "/" })
    .handler(async ({ context: { db, session } }) => {
      const userId = session?.user.id;
      const completed = count();
      const ranked = db.select({
        userId: questParticipation.hunterId,
        completed: completed.as("completed"),
        position: sql<number>`row_number() over (order by ${completed} desc, ${questParticipation.hunterId})`.mapWith(Number).as("position"),
        rank: sql<number>`rank() over (order by ${completed} desc)`.mapWith(Number).as("rank"),
      }).from(questParticipation)
        .where(eq(questParticipation.status, "PAID"))
        .groupBy(questParticipation.hunterId)
        .as("ranked");

      const rows = await db.select({
        userId: ranked.userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        image: user.image,
        walletAddress: user.walletAddress,
        completed: ranked.completed,
        rank: ranked.rank,
        position: ranked.position,
      }).from(ranked)
        .innerJoin(user, eq(user.id, ranked.userId))
        .where(or(lte(ranked.position, LEADERBOARD_SIZE), userId ? eq(ranked.userId, userId) : undefined))
        .orderBy(asc(ranked.position));

      const leaders = rows.filter((entry) => entry.position <= LEADERBOARD_SIZE).map((entry) => {
        const name = entry.name.trim();
        const walletName = /^0x[a-f0-9]{40}$/i.test(name);
        const wallet = walletName ? name : entry.walletAddress;
        return {
          userId: entry.userId,
          name: name && !walletName
            ? name
            : wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : null,
          avatarUrl: (entry.avatarUrl ?? entry.image)?.trim() || null,
          completed: entry.completed,
          rank: entry.rank,
          perkys: entry.completed * PERKYS_PER_QUEST,
        };
      });
      const own = rows.find((entry) => entry.userId === userId);
      return {
        perkysPerQuest: PERKYS_PER_QUEST,
        leaders,
        me: userId ? {
          rank: own?.rank ?? null,
          completed: own?.completed ?? 0,
          perkys: (own?.completed ?? 0) * PERKYS_PER_QUEST,
        } : null,
      };
    }),
});
