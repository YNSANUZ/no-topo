export interface ProtectionRules { baseSeconds: number; incrementSeconds: number; maxSeconds: number }
export const DEFAULT_PROTECTION_RULES: Readonly<ProtectionRules>;
export function bidAmountForMinutes(minutes: number, options?: { baseBidCents?: number; incrementCents?: number; rules?: ProtectionRules }): number;
export function calculateBidOutcome(input: { amountCents: number; baseBidCents?: number; incrementCents?: number; rules?: ProtectionRules; now?: Date }): { amountCents: number; nextBidCents: number; requestedProtectionSeconds: number; protectionSeconds: number; protectedUntil: string; biddingClosed: false; shortenedByReset: false };
