import {Category, Mission} from "@/types/landing_types";

export const categories: Category[] = [
  {
    name: "SOCIAL",
    desc: "Follow, repost, join the community.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 8C17 10.76 14.76 13 12 13C9.24 13 7 10.76 7 8C7 5.24 9.24 3 12 3C14.76 3 17 5.24 17 8Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: "CREATOR",
    desc: "Videos, posts, and original content.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 10L21 6V18L15 14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    name: "TESTER",
    desc: "Try products and report real bugs.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 3H15M12 3V8M6 8H18L19 20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20L6 8Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "COMMUNITY",
    desc: "Discord, live events, and participation.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M2 20C2 16.7 4.7 14 8 14C9.5 14 10.9 14.6 12 15.5M22 20C22 16.7 19.3 14 16 14C14.5 14 13.1 14.6 12 15.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: "ON-CHAIN",
    desc: "Swaps, staking, and protocol interactions.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 22V12M12 12L20 7M12 12L4 7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export const flowSteps = [
  {
    title: "Find a quest",
    desc: "Filter by category, reward, or difficulty and pick the target you want to hunt.",
  },
  {
    title: "Take the action",
    desc: "Follow the exact instructions from the quest contract, published by the brand.",
  },
  {
    title: "Submit proof",
    desc: "Upload a screenshot, a link, or an on-chain hash proving you completed it.",
  },
  {
    title: "Get your reward",
    desc: "Once verified, the payout lands directly in your wallet in the agreed crypto.",
  },
];

export const missions: Mission[] = [
  { badge: "CREATOR", reward: "75 USDC", title: "Create a video showing how you use Perkify", hunters: "32 hunters", percent: 64 },
  { badge: "ON-CHAIN", reward: "120 USDC", title: "Make a swap on the partner protocol and share the hash", hunters: "18 hunters", percent: 41 },
  { badge: "TESTER", reward: "30 USDC", title: "Try the new app and report three bugs", hunters: "54 hunters", percent: 78 },
  { badge: "SOCIAL", reward: "15 USDC", title: "Follow and repost the launch announcement", hunters: "210 hunters", percent: 92 },
  { badge: "COMMUNITY", reward: "25 USDC", title: "Join the Discord and take part in the live AMA", hunters: "87 hunters", percent: 55 },
  { badge: "ON-CHAIN", reward: "90 USDC", title: "Delegate stake to our validator for 7 days", hunters: "9 hunters", percent: 22 },
];