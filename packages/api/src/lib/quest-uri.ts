import { keccak256, toHex } from "viem";

export interface QuestContent {
  title: string;
  description: string;
  category: string | null;
  criteria: string | null;
  validationChecklist: string[];
  /** Descripciones de hitos, en orden. */
  milestones: string[];
}

/**
 * Hash canónico de TODO el contenido off-chain. Orden de claves fijo y versionado:
 * el mismo contenido produce siempre el mismo hash. Si cambia qué se incluye, sube v.
 */
export function hashQuestContent(c: QuestContent) {
  return keccak256(
    toHex(
      JSON.stringify({
        v: 1,
        title: c.title,
        description: c.description,
        category: c.category,
        criteria: c.criteria,
        validationChecklist: c.validationChecklist,
        milestones: c.milestones,
      }),
    ),
  );
}

/** uri que va on-chain: enlaza el borrador (id) y fija el contenido (hash). */
export function buildQuestUri(draftId: string, contentHash: string) {
  return `perkify://quest/${draftId}?h=${contentHash}`;
}

const URI_RE = /^perkify:\/\/quest\/([0-9a-f-]{36})\?h=(0x[0-9a-f]{64})$/;

export function parseQuestUri(uri: string) {
  const m = URI_RE.exec(uri);
  if (!m) return null;
  return { draftId: m[1] as string, contentHash: m[2] as string };
}