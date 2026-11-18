# Quest refunds

The creator can cancel before the deadline if the quest is funded and nobody has ever joined. The creator signs in the wallet that funded the quest. While the cancellation is pending, the quest leaves the marketplace and shows **Cancellation pending** in **My quests**. The API reopens joining if it checks that the escrow is still funded and the authorization has expired on chain.

The worker checks expired quests every 15 seconds. For escrows with automatic refunds, it sends the funds to the original funding wallet after the deadline. It waits while evidence is pending, an approval is valid, or a dispute is open. The quest state and notifications update after the refund is confirmed on chain. The transaction record stores the reason and hash of the confirmed refund.

## Prepare the deployment

1. With the current escrow addresses still configured, generate the database migration. Backfill `quests.escrow_address` for every existing quest with a network assigned, including drafts that may have a funding transaction in progress. Use the current value of `QUEST_ESCROW_ANVIL` for chain 31337 and `QUEST_ESCROW_SEPOLIA` for chain 11155111 in that environment. Store addresses in the same checksum format as the application.

   Also include the participation backfill before applying the migration.

   ```sql
   UPDATE quests AS q
   SET has_joined = true
   WHERE EXISTS (
     SELECT 1 FROM quest_participations AS p WHERE p.quest_id = q.id
   );
   ```

   The backfill can only use participation records that still exist.

2. Deploy the updated `QuestEscrow` on the applicable network. After the backfill, update the existing `QUEST_ESCROW_ANVIL` or `QUEST_ESCROW_SEPOLIA` value in Varlock for that network. New drafts save the new address. Existing quests use their saved address, and the API checks the contract's refund capability when confirming a deposit.
3. Fund the wallet for `VOUCHER_SIGNER_KEY` with gas and start the API. Existing escrows support early cancellation and the creator's emergency withdrawal after 30 days. They cannot execute the new automatic refund.

## Integrate dispute rulings

Acquire the quest row lock before creating a dispute hold or changing its status. For a ruling that refunds the creator, call `finalizeQuestRefund` from [quest-refund.ts](../packages/api/src/lib/quest-refund.ts) with the locked quest and the confirmed transaction. It checks the escrow event, records the refund, and enqueues notifications in the same database transaction.
