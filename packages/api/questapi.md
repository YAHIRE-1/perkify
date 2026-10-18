# Quest API

Qué es, cómo está armada y cómo se conecta con el contrato `QuestEscrow`, la base de datos y el frontend.

> **No se modifica el schema de Drizzle.** La API usa tal cual el schema global de `@perkify/db` (tablas `quests`, `quest_milestones`, `tokens`). Todo lo que parecía requerir columnas nuevas se deriva de otro lado (sección 6).

## 1. Idea en una frase

La API **guarda lo que no cabe on-chain** (título, descripción, criterios), **espeja el estado del contrato en Postgres** para listar rápido y **verifica contra la cadena** todo lo que el cliente afirma. **Nunca firma ni mueve dinero**: eso lo hace la wallet del usuario.

La fuente de verdad del dinero y de los estados es el contrato. La base de datos es un espejo.

## 2. Piezas y dónde viven

```
packages/api/src/
├── routers/
│   ├── index.ts        appRouter: registra  quests: questsRouter
│   └── quests.ts       Los 8 procedimientos (create, update, prepare, confirm, delete, list, get, mine)
└── lib/
    ├── chain.ts        Cliente viem por chain, dirección del contrato, comparar direcciones
    ├── quest-uri.ts    Hash del contenido y formato del uri on-chain
    ├── tokens.ts       Token aceptado (tabla tokens) + decimals leídos del propio token
    └── session.ts      Único lugar que sabe sacar usuario y wallet de la sesión
```

Dependen de: `@perkify/db` (tablas y tipos globales), `@perkify/contracts` (`questEscrowAbi`, dirección del contrato) y el `Context` (sesión SIWE de Better-Auth + `db`).

### Validación Zod

Vive **dentro del schema global** (`packages/db/src/schema/quests.ts`, al final del archivo), no en un paquete o carpeta aparte. Son cinco validadores, uno por forma distinta de entrada:

| Export | Uso |
|---|---|
| `createQuestSchema` | Crear borrador (valida `CreateQuestInput`) |
| `updateQuestSchema` | Editar borrador (`id` + `createQuestSchema.partial()`) |
| `questIdSchema` | `{ id }`, para `get`, `prepare` y `delete` |
| `confirmQuestSchema` | `{ chainId, txHash }` |
| `listQuestsSchema` / `mineQuestsSchema` | Filtros y paginación (`mine` deriva de `list`) |

Los estados salen de `questStatusEnum.enumValues`, así que no hay una segunda lista. Las **reglas de negocio** (deadline mínimo, tope de borradores, `ESCROW_PARAMS`) son constantes al inicio de `routers/quests.ts`.

## 3. Flujo de creación de una quest

```
Frontend                         API                              Cadena (QuestEscrow)
   │                              │                                     │
   │ quests.create ──────────────►│ valida, guarda borrador (DRAFT)     │
   │ quests.update (opcional) ───►│ edita borrador                      │
   │ quests.prepare ─────────────►│ congela contenido, calcula hash,    │
   │◄─────────────────────────────│ devuelve args de createQuest + uri  │
   │                                                                     │
   │ wallet: approve(token) ────────────────────────────────────────────►│
   │ wallet: createQuest(..., uri) ─────────────────────────────────────►│ emite QuestCreated
   │                              │                                     │
   │ quests.confirm(txHash) ─────►│ lee recibo, decodifica evento,      │
   │                              │ lee quests(id).uri, compara todo    │
   │◄─────────────────────────────│ enlaza borrador ↔ id on-chain       │
```

1. **`create`**: borrador (`status = DRAFT`, `escrowStatus = NONE`) con sus milestones.
2. **`update`**: edita el borrador mientras `escrowStatus` siga en `NONE`.
3. **`prepare`**: pone `escrowStatus = PENDING` (queda congelado) y devuelve los argumentos exactos de `createQuest`, incluido el `uri`.
4. **La wallet firma** `approve` y `createQuest`. La API no participa.
5. **`confirm`**: verifica en la cadena y enlaza. Guarda el id on-chain en `escrowId`, pasa a `FUNDED` y `escrowStatus = LOCKED`.

### El `uri` on-chain

Formato: `perkify://quest/<draftId>?h=<keccak256 del contenido>`

- `draftId` enlaza la tx con el borrador (porque `QuestCreated` **no incluye** el uri; se lee con `quests(id)`).
- `h` fija el contenido: título, descripción, categoría, criterios, checklist y milestones. Si algo cambia después, el hash ya no coincide. El hash **no se guarda en la DB**: se recalcula del contenido y se compara con el del uri.

## 4. Qué verifica `confirm`

La entrada es solo `chainId` y `txHash`; todo lo demás se lee de la cadena.

1. La tx existe y **no revirtió**.
2. El evento `QuestCreated` lo emitió **nuestro contrato** y su `creator` es la **wallet de la sesión** (comparación en minúsculas).
3. El `uri` on-chain tiene nuestro formato y apunta a un borrador **del mismo usuario y de la misma chain** (la chain sale del token de la quest).
4. El borrador está `PENDING` (fue preparado).
5. El hash recalculado del contenido coincide con el del uri.
6. Token, monto, deadline, `refundGrace` y `reviewWindow` on-chain **coinciden con el borrador y con `ESCROW_PARAMS`**.
7. La actualización solo aplica si el borrador sigue en `DRAFT`.

Es **idempotente**: confirmar dos veces la misma tx devuelve la misma quest. Si el mismo borrador se fondea dos veces on-chain, la segunda tx no se enlaza (`CONFLICT`).

## 5. Procedimientos

| Procedimiento | Acceso | Qué hace |
|---|---|---|
| `quests.create` | Sesión | Crea borrador (máx. 20 abiertos por usuario) |
| `quests.update` | Sesión, dueño | Edita borrador no preparado |
| `quests.prepare` | Sesión, dueño | Congela y devuelve args de `createQuest` |
| `quests.confirm` | Sesión | Verifica on-chain y enlaza |
| `quests.delete` | Sesión, dueño | Borra un borrador. Una quest fondeada no se borra |
| `quests.list` | Público | Quests fondeadas, cursor, filtros por estado, chain, token y categoría |
| `quests.get` | Público | Detalle con milestones. Un borrador solo lo ve su creador |
| `quests.mine` | Sesión | Mis quests, incluyendo borradores |

`list` devuelve `QuestSummary` y `get` devuelve `Quest` (con `acceptedTokenSymbol` y fechas como string), los tipos del schema global.

## 6. Qué columnas del contrato NO se añadieron, y de dónde sale cada dato

| Dato | Dónde vive | Por qué no hace falta columna |
|---|---|---|
| `chainId` | `tokens.chainId` (join) | La chain de la quest es la de su token |
| Dirección del contrato | `getQuestEscrowAddress(chainId)` | Es configuración, una por chain |
| Wallet del creador | Sesión SIWE / evento on-chain | `confirm` ya la compara; no se duplica |
| `contentHash` | Se recalcula | Se compara contra el hash del uri on-chain |
| Estado "preparada" | `escrowStatus = PENDING` | Ya existe en el enum |
| `refundGrace`, `reviewWindow` | `ESCROW_PARAMS` (constantes en el router) | Los fija la plataforma, no el creador |
| `decimals` del token | Lectura `decimals()` del ERC-20, con caché | Los decimals no cambian |
| id on-chain | `escrowId` (ya existía) | Se guarda como texto |

Lo que se pierde al no tener columnas: `txHash` de creación (queda en los eventos on-chain y lo guardará el indexer) y un índice único `(chain, contrato, escrowId)`. Cuando se haga el indexer conviene añadir ese índice.

### Estados: contrato → base de datos

| Contrato (`Status`) | `quests.status` | `quests.escrowStatus` |
|---|---|---|
| (borrador) | `DRAFT` | `NONE`, luego `PENDING` tras `prepare` |
| 0 Funded | `FUNDED` | `LOCKED` |
| 1 Approved | `APPROVED` | `LOCKED` |
| 2 Disputed | `DISPUTED` | `LOCKED` |
| 3 Paid | `COMPLETED` | `RELEASED` |
| 4 Refunded | `CANCELLED` | `REFUNDED` |

`CLAIMED`, `SUBMITTED` y `EXPIRED` siguen en el enum pero ningún procedimiento actual los escribe. Encajan mal con el contrato (varios postulantes, un solo ganador) y se resuelven con `claims` y el indexer.

## 7. Seguridad

- **SIWE solo identifica.** Se conecta con el contrato únicamente por la dirección: la wallet de la sesión debe ser el `msg.sender` on-chain.
- **El servidor decide los parámetros**, no el cliente: `prepare` los toma del borrador y de `ESCROW_PARAMS`, y `confirm` los compara contra la cadena.
- **Contenido inmutable tras fondear**: hash en el uri y borrador congelado desde `prepare`.
- **`isBoosted` lo ignora el servidor** (siempre `false` al crear).
- **Los tokens salen de la tabla `tokens`**, no de lo que mande el cliente.
- Los montos viajan como **string** (unidades mínimas) para no perder precisión en JSON.
- La API **no guarda llaves** ni firma transacciones.

## 8. Decisiones y sus consecuencias

| Decisión | Por qué | Consecuencia |
|---|---|---|
| Sin cambios al schema global | Evitar un schema paralelo y migraciones extra | Se pierde `txHash` e índice único hasta el indexer |
| Borrador congelado tras `prepare` | Si se editara entre firma y `confirm`, el hash no coincidiría y los fondos quedarían sin quest enlazada | Para cambiar algo se borra el borrador y se crea otro |
| Hash cubre todo el contenido off-chain | Evitar cambiar criterios o hitos tras fondear | Cambiar qué se incluye obliga a subir la versión (`v`) del hash |
| `refundGrace` y `reviewWindow` fijos por plataforma | Menos superficie y sin columnas nuevas | Si se quiere por quest, habrá que añadir columnas |
| Sin `update` para quests fondeadas | El estado lo manda el contrato | Los cambios de estado llegan por `confirm` o por el indexer |
| `confirm` además del indexer | Actualiza la UI al instante | El indexer cubre el caso de que el usuario cierre la pestaña |

## 9. Supuestos que hay que verificar

1. **Wallet en la sesión:** `session.user.walletAddress` (se cambia solo en `lib/session.ts`).
2. **Exports de `@perkify/db`:** que la raíz exporte `quests`, `questMilestones`, `tokens`, `questStatusEnum`, `Db`, los tipos de quest (confirmado para `tokens`).
3. **Dependencias:** `packages/db` necesita `zod`; `packages/api` necesita `viem` y `drizzle-orm`.
4. **Driver de Postgres:** debe soportar `db.transaction` (con `neon-http` no funciona).
5. **Lectura de `quests(id)`:** se asume que viem la devuelve como arreglo posicional `(creator, token, reward, deadline, refundGrace, reviewWindow, status, winner, pendingClaims, uri)`.
6. **`ESCROW_PARAMS`** (7 días cada uno) y `LIMITS` son placeholders; deben cumplir lo que valide el contrato.
7. **Variables de entorno:** `ARBITRUM_SEPOLIA_RPC_URL` y `ARBITRUM_RPC_URL`. Además, `create`, `update` y `prepare` hacen una lectura RPC la primera vez por token (después sale de caché).
8. **Migración:** ninguna por esta API; el schema global ya incluye `APPROVED` y `DISPUTED`.

## 10. Qué falta

- **`claims` y `disputes`:** tablas y procedimientos (`claims.attachEvidence`, `claims.listForQuest`, `disputes.attachEvidence`).
- **Indexer** en `apps/server`: sincroniza `ClaimSubmitted`, `QuestApproved`, `DisputeOpened`, etc., con `indexer_state`, idempotencia por `(txHash, logIndex)` y confirmaciones. Ahí añadir el índice único y `txHash`.
- **Reflejar el hunter ganador** en `hunterId` cuando el contrato apruebe a un postulante.
- **`admin.disputes.list`** con rol de árbitro.
- Pruebas contra Arbitrum Sepolia y revisión de los supuestos de la sección 9.