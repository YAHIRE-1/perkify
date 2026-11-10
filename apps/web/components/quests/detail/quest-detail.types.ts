export type QuestMilestone = {
  id: string;
  description: string;
  position: number;
};

export type QuestDetailData = {
  id: string;
  creatorId: string;

  title: string;
  description: string;
  category: string | null;
  criteria: string | null;

  rewardAmount: string;
  tokenId: string;
  acceptedTokenSymbol?: string;

  token?: {
    symbol: string;
  };

  status: string;
  isBoosted: boolean;

  deadline: string;
  maxParticipants: number;
  submitWindowHours: number;
  reviewWindowHours: number;
  maxAttempts: number;

  escrowId: string | null;
  chainId: number | null;
  createTxHash: string | null;
  escrowStatus: string;

  validationChecklist: string[];
  milestones: QuestMilestone[];

  createdAt: string;
  updatedAt: string;
  archived: string | null;
};