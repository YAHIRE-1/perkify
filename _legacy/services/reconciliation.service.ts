import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, In, Repository } from 'typeorm';
import { Quest } from '../quests/entities/quest.entity';
import { QuestStatus } from '../common/enums/quest-status.enum';
import { BlockchainProviderService } from '../blockchain/blockchain-provider.service';

// Kleros Escrow V2 on-chain status codes. Adjust to match the real contract enum.
enum OnChainEscrowStatus {
  NoDispute = 0,
  WaitingSender = 1,
  WaitingReceiver = 2,
  DisputeCreated = 3,
  Resolved = 4,
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questsRepository: Repository<Quest>,
    private readonly blockchainProviderService: BlockchainProviderService,
  ) {}

  // Runs every 5 minutes. Adjust the cron expression if you need 10 minutes instead.
  @Cron('*/5 * * * *')
  async reconcile(): Promise<void> {
    this.logger.log('Starting on-chain reconciliation sweep');

    const staleDraftThreshold = new Date(Date.now() - 5 * 60 * 1000);

    const candidates = await this.questsRepository.find({
      where: [
        { status: QuestStatus.DRAFT, createdAt: LessThan(staleDraftThreshold) },
        {
          status: In([QuestStatus.SUBMITTED, QuestStatus.DISPUTED]),
        },
      ],
    });

    for (const quest of candidates) {
      try {
        await this.reconcileQuest(quest);
      } catch (error) {
        this.logger.error(
          `Failed to reconcile quest ${quest.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Reconciliation sweep finished. Checked ${candidates.length} quest(s).`,
    );
  }

  private async reconcileQuest(quest: Quest): Promise<void> {
    if (!quest.escrowId) {
      // Nothing to reconcile yet — no on-chain escrow has been created for this quest.
      return;
    }

    const onChainData = await this.blockchainProviderService.getEscrowTransaction(
      quest.escrowId,
    );

    const onChainStatus = Number(onChainData.status) as OnChainEscrowStatus;
    const mappedStatus = this.mapOnChainStatus(onChainStatus);

    if (mappedStatus && mappedStatus !== quest.status) {
      this.logger.warn(
        `Quest ${quest.id} out of sync: DB=${quest.status} chain=${mappedStatus}. Updating.`,
      );
      quest.status = mappedStatus;
      await this.questsRepository.save(quest);
    }
  }

  private mapOnChainStatus(
    status: OnChainEscrowStatus,
  ): QuestStatus | null {
    switch (status) {
      case OnChainEscrowStatus.WaitingSender:
      case OnChainEscrowStatus.WaitingReceiver:
        return QuestStatus.FUNDED;
      case OnChainEscrowStatus.DisputeCreated:
        return QuestStatus.DISPUTED;
      case OnChainEscrowStatus.Resolved:
        return QuestStatus.RESOLVED;
      default:
        return null;
    }
  }
}
