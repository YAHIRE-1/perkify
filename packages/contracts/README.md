# @perkify/contracts

Smart contract de escrow para quests (Foundry + paquete TypeScript con viem).

## Primeros pasos

```bash
# 1. Instalar Foundry (una vez): https://book.getfoundry.sh/getting-started/installation
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. Desde la raíz del monorepo
pnpm install

# 3. Dependencias de Solidity (forge-std y OpenZeppelin) → carpeta lib/
pnpm --filter @perkify/contracts install:libs

# 4. Compilar, probar y exportar el ABI a TypeScript
pnpm --filter @perkify/contracts test
pnpm --filter @perkify/contracts build:abi
```

## Mapa de archivos

| Archivo | Para qué sirve |
|---|---|
| `src/QuestEscrow.sol` | El contrato. Guarda los fondos y aplica las reglas. |
| `test/QuestEscrow.t.sol` | 24 tests: camino feliz, disputas, reembolsos y permisos. |
| `test/mocks/MockERC20.sol` | Token falso (simula USDC) solo para tests. |
| `script/Deploy.s.sol` | Script de despliegue a Arbitrum. |
| `foundry.toml` | Configuración de Foundry: versión de Solidity, redes, Arbiscan. |
| `remappings.txt` | Atajos de imports (`@openzeppelin/...`, `forge-std/...`). |
| `.env.example` | Variables necesarias (RPC, llave de deploy, árbitro). Copiar a `.env`. |
| `scripts/export-abi.mjs` | Convierte el ABI compilado en `src/ts/abi.ts`. |
| `src/ts/abi.ts` | ABI tipado (GENERADO). Lo consumen web y server. |
| `src/ts/addresses.ts` | Dirección del contrato por red. Se llena tras cada deploy. |
| `src/ts/types.ts` | Enum `QuestStatus` espejo del enum del contrato. |
| `src/ts/index.ts` | Punto de entrada: `import { questEscrowAbi } from "@perkify/contracts"`. |
| `package.json` / `tsconfig.json` | Hacen que sea un paquete más del workspace pnpm. |

## Despliegue

```bash
cp .env.example .env      # completar DEPLOYER_PRIVATE_KEY, ARBITER_ADDRESS, etc.
pnpm --filter @perkify/contracts deploy:sepolia
```

Copiar la dirección impresa a `src/ts/addresses.ts`.

## Pendientes antes de producción

- Árbitro = multisig (Safe), nunca una wallet suelta.
- Plazo máximo de resolución del árbitro (regla por defecto si no resuelve).
- Comisión de plataforma.
- Auditoría externa.
