/// Estados de una quest. Deben coincidir EXACTAMENTE con el enum Status del contrato.
export enum QuestStatus {
  Funded = 0,
  Approved = 1,
  Disputed = 2,
  Paid = 3,
  Refunded = 4,
}
