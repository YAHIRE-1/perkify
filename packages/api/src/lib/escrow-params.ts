export const REFUND_GRACE_S = 14 * 24 * 3600;

export const escrowTimes = (reviewWindowHours: number) => ({
  refundGrace: REFUND_GRACE_S,
  reviewWindow: reviewWindowHours * 3600,
});