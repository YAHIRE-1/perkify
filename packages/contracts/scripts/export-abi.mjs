// Lee el ABI compilado por Foundry (out/) y lo escribe como TypeScript tipado.
// Uso: pnpm build:abi   (después de `forge build`)
import { readFileSync, writeFileSync } from "node:fs";

const artifact = JSON.parse(
  readFileSync(new URL("../out/QuestEscrow.sol/QuestEscrow.json", import.meta.url), "utf8"),
);

const content = `// ⚠️ ARCHIVO GENERADO por scripts/export-abi.mjs — no editar a mano.
export const questEscrowAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;

writeFileSync(new URL("../src/ts/abi.ts", import.meta.url), content);
console.log("ABI exportado a src/ts/abi.ts");
