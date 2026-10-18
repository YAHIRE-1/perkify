# Resumen: sistema de quests con escrow cripto en Perkify

## 1. Qué construimos y por qué

Perkify permite que un **creador** publique una quest con recompensa en cripto, que **cualquiera** se postule, y que el dinero solo salga bajo reglas que nadie puede saltarse. El dinero lo guarda un contrato inteligente en Arbitrum, no una persona ni tu servidor.

La idea original cambió en tres puntos durante la conversación:
- **Creador y fondeador son la misma persona.** Eso eliminó la regla de "ambos deben estar de acuerdo", que ya no tenía sentido.
- **Entonces el creador tenía poder total**, y el postulante dependía de su buena fe. Se resolvió con un árbitro.
- **La plataforma es el árbitro**, no Kleros. Kleros quedó como una posible evolución futura.

## 2. Cómo funciona el contrato (`QuestEscrow.sol`)

Es **un solo contrato compartido**, donde cada quest es una entrada en una tabla (no se despliega un contrato por quest, que sería mucho más caro).

**Flujo normal:**
1. El creador llama `createQuest`: define token, monto, deadline y metadata. Los fondos se bloquean en esa misma transacción.
2. Cualquiera llama `submitClaim` para postularse antes del deadline.
3. El creador llama `approve` sobre un postulante, y ese postulante llama `withdrawReward` para cobrar.

**Protecciones contra el abuso:**
- El creador **no puede recuperar fondos** (`refund`) mientras haya postulaciones sin resolver. No puede cobrar por silencio.
- Si el creador rechaza (`reject`) o no responde en `reviewWindow`, el postulante abre una `dispute`.
- El **árbitro** resuelve con `resolveDispute`: paga a un postulante o devuelve al creador. Solo puede pagar a alguien que realmente se postuló.
- El creador no puede postularse a su propia quest ni ser el árbitro.
- El cambio de árbitro es en dos pasos (`transferArbiter` y `acceptArbiter`) para evitar errores de dirección.

**Estados:** `Funded → Approved → Paid`, o `Funded → Disputed → Paid/Refunded`, o `Funded → Refunded`.

**Lo que el contrato no hace:** no verifica que la quest se haya cumplido de verdad. Eso lo deciden personas (el creador y, en disputa, la plataforma). El contrato solo garantiza que el dinero se mueva exactamente según esas decisiones.

## 3. Tecnologías y su papel

| Pieza | Función |
|---|---|
| **Solidity 0.8.28** | Lenguaje del contrato |
| **Foundry** (`forge`, `cast`, `anvil`) | Compilar, probar, desplegar e interactuar |
| **OpenZeppelin 5.1** | `SafeERC20` y `ReentrancyGuard`, código auditado y reutilizado |
| **forge-std** | Utilidades para escribir tests y scripts |
| **Arbitrum (Sepolia y One)** | Redes de despliegue, de bajo costo |
| **viem / wagmi** | Cómo web y server hablarán con el contrato |
| **SIWE + Better-Auth** | Login con wallet. Es solo identidad **off-chain** y no mueve dinero |
| **Varlock** | Valida y carga las variables de entorno desde el esquema |
| **Drizzle + Postgres** | Espejo de los eventos on-chain para mostrar quests rápido |

Algo clave: **SIWE y el contrato son mundos separados.** SIWE firma un mensaje gratis para identificar al usuario. Mover dinero requiere firmar una transacción on-chain, que cuesta gas. Se conectan solo por la dirección de la wallet.

## 4. El monorepo

```
perkify-full/
├── apps/web          Next.js 14 (frontend)
├── apps/server       Bun + Hono (API oRPC)
├── packages/
│   ├── api, auth, db, shared, config   (ya existían)
│   └── contracts     ← NUEVO
│       ├── src/QuestEscrow.sol         el contrato
│       ├── test/QuestEscrow.t.sol      24 tests
│       ├── test/mocks/MockERC20.sol    token falso para tests
│       ├── script/Deploy.s.sol         despliegue real (Sepolia/mainnet)
│       ├── script/DeployLocal.s.sol    despliegue local (Anvil)
│       ├── scripts/export-abi.mjs      ABI → TypeScript
│       ├── src/ts/abi.ts               ABI tipado (generado)
│       ├── src/ts/addresses.ts         dirección por red
│       ├── src/ts/types.ts             enum QuestStatus
│       ├── src/ts/index.ts             punto de entrada
│       ├── foundry.toml, remappings.txt
│       └── package.json
```

Web y server lo consumirán con `"@perkify/contracts": "workspace:*"`. Para Next.js hace falta además `transpilePackages: ["@perkify/contracts"]`. Eso **todavía no está conectado**.

## 5. Variables de entorno (esquema de Varlock)

Se añadieron al esquema raíz, **sin `@required`** para no romper el arranque de web y server:

| Variable | Valor | Dónde va |
|---|---|---|
| `ARBITRUM_SEPOLIA_RPC_URL`, `ARBITRUM_RPC_URL` | URLs públicas de Arbitrum | Esquema |
| `DEPLOYER_PRIVATE_KEY` | Wallet solo para desplegar (`cast wallet new`) | `.env.local` |
| `ARBITER_ADDRESS` | Dirección pública del árbitro (Safe en producción) | `.env.local` |
| `ARBISCAN_API_KEY` | Llave gratuita de Etherscan para verificar el contrato | `.env.local` |

`.env.local` nunca va a git. Los scripts de deploy del paquete usan `varlock run --`, igual que tu paquete `db`.

## 6. Cómo lo hemos probado (tres niveles)

**Nivel 1: tests de Solidity (hecho, 24 pasan en tu máquina)**
```bash
pnpm --filter @perkify/contracts install:libs   # una sola vez
pnpm --filter @perkify/contracts test
```
Cubren el camino feliz, las disputas, los reembolsos bloqueados, los permisos y un fuzz test con montos aleatorios. No necesitan red ni Anvil.

**Nivel 2: red local con Anvil (hecho)**
```bash
# Terminal 1
anvil

# Terminal 2, en packages/contracts
export ARBITER_KEY=0x59c6...690d
forge script script/DeployLocal.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac09...ff80
```
Despliega un token falso y el escrow. Luego se simulan las acciones con `cast send` y `cast call`. Las llaves usadas son las **públicas de Anvil**, seguras solo en local.

**Nivel 3: Arbitrum Sepolia (pendiente)**

Anvil confirmó que el flujo funciona con transacciones reales: aprobar, retirar y resolver una disputa dejan los saldos correctos y el escrow en 0.

## 7. Cómo funcionará en producción

1. **Despliegue** (desde `packages/contracts`):
   ```bash
   pnpm deploy:sepolia      # pruebas
   pnpm deploy:mainnet      # real
   ```
   Varlock carga las variables, `forge` despliega y verifica en Arbiscan. La dirección se pega en `addresses.ts`.
2. **Frontend:** el usuario hace SIWE y firma las transacciones con wagmi (`approve` del token y luego `createQuest`).
3. **Eventos:** el contrato emite `QuestCreated`, `ClaimSubmitted`, `DisputeOpened` y otros. El server los escucha con viem y los guarda en Postgres.
4. **Tu UI lee de Postgres** (rápido), pero **la fuente de verdad del dinero es siempre el contrato**.
5. **Disputas:** tu equipo revisa la evidencia y el árbitro (multisig Safe) ejecuta `resolveDispute`.

**Quién paga gas:** creador (`createQuest`, `approve`, `refund`), postulante (`submitClaim`, `dispute`, `withdrawReward`) y plataforma (`resolveDispute`). En mi entorno `createQuest` costó unos 200k de gas, y el despliegue del contrato 1.43M. En tu máquina el gas por test salió mayor; conviene medirlo con `pnpm --filter @perkify/contracts test:gas` y en Sepolia.

## 8. Problemas de Windows que resolvimos

| Síntoma | Causa | Solución |
|---|---|---|
| `forge` / `anvil` no se reconoce | Foundry no instalado o sin PATH | `foundryup` y agregar `C:\Users\yahir\.foundry\bin` al PATH de Windows |
| `contract source info format must be…` | `pnpm` pasó mal los argumentos, y luego el archivo `DeployLocal.s.sol` no existía | Llamar a `forge` directo y copiar el archivo |
| `VAR=valor pnpm ...` no funciona | Sintaxis de bash, no de `cmd.exe` | Usar `export VAR=...` antes |

## 9. Qué falta

- **Antes de producción:** pasar el árbitro a un **multisig Safe**; añadir un **plazo máximo de resolución del árbitro** (hoy una disputa sin resolver deja fondos bloqueados); definir la **comisión de plataforma**; hacer una **auditoría externa**.
- **Integración:** el listener de eventos del server, las llamadas desde el frontend y el panel interno de arbitraje.
- **Decisión de tu monorepo:** `turbo run build/test` ahora ejecutará `forge` en ese paquete, así que fallará en cualquier CI o máquina sin Foundry. Hay que instalarlo allí o renombrar esos scripts.
- **Antes de mainnet:** probar en Sepolia, y empezar con límites bajos de monto por quest.

**Aclaración sobre Kleros:** tu README lo menciona como parte del stack. Lo que construimos usa la plataforma como árbitro, que es lo que pediste. Kleros puede integrarse después para apelaciones si quieres una capa neutral.

¿Quieres que ponga este resumen en un documento para guardarlo o compartirlo con tu equipo?