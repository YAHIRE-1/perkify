# Project Architecture: Perkify

Perkify is a Web3-enabled platform for creating and managing "Quests" (missions/tasks) with escrowed rewards. It connects "Buyers" (Quest creators) and "Hunters" (Quest completers) using blockchain technology for secure payment handling.

## 🏗️ Architecture Overview

The project is built as a **Next.js (App Router)** application, following a layered architecture that separates data schemas, API communication, and UI components.

### 1. Tech Stack
- **Frontend Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Web3 Integration**: 
  - [Wagmi](https://wagmi.sh/) & [Viem](https://viem.sh/) (Ethereum/EVM interaction)
  - [SIWE (Sign-In with Ethereum)](https://eips.ethereum.org/EIPS/eip-4361) (Authentication)
- **State Management & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Validation**: [Zod](https://zod.dev/) (Schema validation for API responses and forms)
- **Icons**: Lucide React

## 📁 Project Structure

```text
├── app/                # Next.js App Router (Pages, Layouts, API routes)
│   ├── quests/         # Quest management (List, Create, Detail, Edit)
│   ├── dashboard/      # User activity overview
│   ├── profile/        # User profile and settings
│   └── login/          # Web3 authentication flow
├── collections/        # Data schemas and types (Zod definitions)
│   └── schemas/        # Quest and User schemas
├── components/         # Reusable UI components
│   ├── global/         # Layout-wide components (Logo, Footer)
│   ├── landing/        # Landing page specific components
│   └── ...             # Feature-specific components (QuestCard, QuestForm)
├── api/                # API Client and communication layer
│   └── client.ts       # Centralized API wrapper (fetch, auth headers)
├── hooks/              # Custom React hooks for business logic
│   ├── useQuests.ts    # Quest data fetching and mutations
│   ├── useAuth.ts      # Authentication and session management
│   └── useEscrow.ts    # Blockchain escrow interactions
├── lib/                # Shared utilities and configuration
│   ├── wagmi.ts        # Web3 provider and chain configuration
│   └── siwe.ts         # SIWE utility functions
├── providers/          # React Context providers (QueryClient, Wagmi)
└── types/              # Global TypeScript interfaces
```

## 🔄 Core Relations & Data Flow

### Quest Lifecycle
The platform revolves around the `Quest` entity. The typical flow is:
1. **Creation**: A `BUYER` creates a Quest $\rightarrow$ `QuestStatus: DRAFT` $\rightarrow$ `FUNDED`.
2. **Acceptance**: A `HUNTER` accepts the Quest $\rightarrow$ `QuestStatus: IN_PROGRESS`.
3. **Submission**: Hunter submits proof of completion $\rightarrow$ `QuestStatus: SUBMITTED`.
4. **Resolution**: Buyer reviews submission $\rightarrow$ `QuestStatus: APPROVED` (Funds released) or `DISPUTED`.

### User Roles
- **HUNTER**: Completes quests to earn rewards.
- **BUYER**: Posts quests and funds rewards via escrow.
- **ADMIN**: Manages the platform and resolves disputes.

### API $\leftrightarrow$ Blockchain Interaction
The application interacts with two main backends:
- **REST API**: Handles metadata, user profiles, and quest state (via `api/client.ts`).
- **Smart Contracts**: Handles the actual locking and releasing of funds (via `wagmi` and `viem`).

## 🛠️ Key Tools & Utilities

- **`api/client.ts`**: A lightweight wrapper around `fetch` that automatically handles JWT tokens (`prky_token`) and provides a structured interface for API calls.
- **`collections/schemas/`**: Uses Zod to ensure that the data received from the backend matches the expected structure, providing runtime type safety.
- **`hooks/`**: Encapsulate complex logic (like polling for escrow status or managing quest filters) to keep components clean and focused on UI.
- **`lib/wagmi.ts`**: Configures the connection to Arbitrum and Sepolia networks, allowing the app to work across different environments (testnet/mainnet).
