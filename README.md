# Perkify

Decentralized quest and reward platform enabling buyers to create escrowed quests and hunters to complete them for rewards. Integrates blockchain events for trustless payment and Kleros for decentralized dispute resolution.

## Arquitectura y Mapa del Workspace

```
perkify-full/
├── apps/                          # Puntos de entrada/deploy
│   ├── web/                      # Frontend Next.js 14 (punto de entrada)
│   └── server/                   # Backend Bun + Hono (serve oRPC router)
├── packages/                     # Librerías internas compartidas
│   ├── api/                      # Definición de procedimientos oRPC (shared entre apps)
│   ├── auth/                     # Autenticación SIWE + Better-Auth
│   ├── config/                   # Configuración TypeScript base
│   ├── contracts/                 # Smart contract ABIs y constantes blockchain
│   └── db/                       # Drizzle ORM + PostgreSQL schema & client
└── packages/shared               # Zod types y utilidades compartidas
```

**Flujo de dependencias:**
```
apps/web & apps/server
    ├─ @perkify/api ←────────────┐
    │                            ↓
    └─ app consume → [procedures]
    
apps/web
    └─ [@perkify/auth, @perkify/db] ←─ packages/shared
apps/server
    ├── [@perkify/api, @perkify/auth, @perkify/db]
    └─ @perkify/config
```

## Tech Stack Global

| Categoría                 | Herramientas principales                          |
|---------------------------|---------------------------------------------------|
| **Orquestación**          | pnpm workspace + Turbo                            |
| **Frontend Framework**    | Next.js 14 (App Router)                         |
| **Backend Framework**     | Hono (Bun runtime)                              |
| **Base de datos**         | PostgreSQL (Drizzle ORM)                         |
| **Autenticación**         | SIWE + Better-Auth                               |
| **Blockchain**            | Arbitrum (viem, wagmi)                          |
| **Dispute Resolution**    | Kleros Escrow V2                                 |
| **Type Validation**       | Zod                                              |
| **Microservice RPC**      | oRPC (@orpc/server/client)                       |

## Guía de Inicio Rápido

```bash
# Instalar dependencias del monorepo
pnpm install

# Configurar variables de entorno (copiar y editar .env.example si existe, 
# luego generar los tipos con Varlock)
cp .env.example .env
varlock run -- pnpm dlx auth@latest generate --config src/services.ts --output packages/db/src/schema/auth.ts

# Ejecutar en desarrollo (frontend + backend en paralelo)
pnpm dev

# Comandos DB específicos
pnpm db:up       # Iniciar PostgreSQL con Docker Compose
pnpm db:studio   # Abrir Drizzle Studio
```

## Scripts Principales

| Comando        | Descripción                                        |
|----------------|----------------------------------------------------|
| `dev`          | Arrancar ambos apps en modo desarrollo (paralelo) |
| `build`        | Compilar todo el monorepo                          |
| `lint`         | Ejecutar checks de código sobre todos los paquetes |
| `test`         | Ejecutar tests sobre todo el workspace             |
| `typecheck`    | Verificación estricta de TypeScript                 |
| `start`        | Arrancar solo el backend server                    |

## Comandos Workspace Específicos

```bash
# Backend (server)
pnpm --filter server build      # Construir el backend
pnpm --filter server start      # Ejecutar el backend

# Frontend (web)
pnpm --filter web dev           # Arrancar Next.js en 3001

# DB & Migrations
pnpm --filter @perkify/db db:generate  # Generar tipos desde schema
pnpm --filter @perkify/db db:push      # Aplicar migrations
pnpm db:up                              # Docker PostgreSQL
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
