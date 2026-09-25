import test from "node:test";
import assert from "node:assert/strict";
import { bidAmountForMinutes, calculateBidOutcome } from "./bid-outcome.mjs";

test("converts protection presets to their exact bid", () => {
  assert.equal(bidAmountForMinutes(10), 2000);
  assert.equal(bidAmountForMinutes(20), 12000);
  assert.equal(bidAmountForMinutes(30), 22000);
  assert.equal(bidAmountForMinutes(60), 52000);
});

test("explains amount, protection and next minimum", () => {
  const outcome = calculateBidOutcome({ amountCents: 10000, now: new Date("2026-09-25T20:00:00Z") });
  assert.equal(outcome.protectionSeconds, 1080);
  assert.equal(outcome.nextBidCents, 12000);
  assert.equal(outcome.protectedUntil, "2026-09-25T20:18:00.000Z");
  assert.equal(outcome.biddingClosed, false);
});

test("caps protection at one hour without a daily reset", () => {
  const outcome = calculateBidOutcome({ amountCents: 120000, now: new Date("2026-09-26T02:30:00Z") });
  assert.equal(outcome.protectionSeconds, 3600);
  assert.equal(outcome.protectedUntil, "2026-09-26T03:30:00.000Z");
  assert.equal(outcome.biddingClosed, false);
});
