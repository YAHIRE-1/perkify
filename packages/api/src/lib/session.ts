import { ORPCError } from "@orpc/server";

import type { Context } from "../context";

type SessionUser = { id: string; walletAddress?: string | null };

function sessionUser(context: Pick<Context, "session">): SessionUser | null {
  return (context.session?.user as SessionUser | undefined) ?? null;
}

/** id del usuario o null (para procedimientos públicos). */
export function getSessionUserId(context: Pick<Context, "session">): string | null {
  return sessionUser(context)?.id ?? null;
}

/**
 * Con SIWE toda sesión nace con una wallet, así que usuario y wallet van siempre juntos.
 * SUPUESTO: Better-Auth la expone como session.user.walletAddress. Si en tu configuración
 * es otro campo (o una consulta a la tabla walletAddress), se cambia solo aquí.
 */
export function requireUser(context: Pick<Context, "session">) {
  const user = sessionUser(context);
  if (!user) throw new ORPCError("UNAUTHORIZED");
  if (!user.walletAddress) {
    // Invariante rota: una sesión SIWE sin wallet no debería existir.
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Sesión sin wallet asociada" });
  }
  return { userId: user.id, address: user.walletAddress.toLowerCase() };
}