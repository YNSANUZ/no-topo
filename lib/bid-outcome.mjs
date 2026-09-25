export const DEFAULT_PROTECTION_RULES = Object.freeze({ baseSeconds: 600, incrementSeconds: 120, maxSeconds: 3600 });

export function bidAmountForMinutes(minutes, { baseBidCents = 2000, incrementCents = 2000, rules = DEFAULT_PROTECTION_RULES } = {}) {
  const targetSeconds = Math.min(rules.maxSeconds, Math.max(rules.baseSeconds, Math.round(minutes * 60)));
  const increments = Math.ceil((targetSeconds - rules.baseSeconds) / rules.incrementSeconds);
  return baseBidCents + increments * incrementCents;
}

export function calculateBidOutcome({ amountCents, baseBidCents = 2000, incrementCents = 2000, rules = DEFAULT_PROTECTION_RULES, now = new Date() }) {
  const increments = Math.max(0, Math.floor((amountCents - baseBidCents) / incrementCents));
  const requestedProtectionSeconds = Math.min(rules.maxSeconds, rules.baseSeconds + increments * rules.incrementSeconds);
  const protectionSeconds = requestedProtectionSeconds;
  return {
    amountCents,
    nextBidCents: amountCents + incrementCents,
    requestedProtectionSeconds,
    protectionSeconds,
    protectedUntil: new Date(now.getTime() + protectionSeconds * 1000).toISOString(),
    biddingClosed: false,
    shortenedByReset: false,
  };
}
