import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { AppRouterClient } from '@perkify/api/routers/index';


// NEXT_PUBLIC_PERKIFY_API_URL viene del schema de varlock (.env.schema).
// Debe referenciarse literal para que Next.js la inyecte en el bundle del navegador.
const API_URL = process.env.NEXT_PUBLIC_PERKIFY_API_URL;
if (!API_URL) {
  throw new Error('Falta NEXT_PUBLIC_PERKIFY_API_URL (revisa el schema de varlock)');
}

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  fetch: (request, init) => fetch(request, { ...init, credentials: 'include' }),
});

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

export const orpc: AppRouterClient = createORPCClient(link);