import test from "node:test";
import assert from "node:assert/strict";
import { createVisitorNickname, normalizeNickname, onboardingAura } from "./player-identity.mjs";

test("creates a stable visitor-shaped fallback", () => {
  assert.match(createVisitorNickname(() => 0.425), /^Visitante 482$/);
});

test("accepts a short clean nickname", () => {
  assert.deepEqual(normalizeNickname("  Luna  "), { allowed: true, nickname: "Luna", reason: null });
});

test("blank nickname keeps the current visitor name", () => {
  assert.deepEqual(normalizeNickname(" ", "Visitante 482"), { allowed: true, nickname: "Visitante 482", reason: null });
});

for (const [label, nickname, reason] of [
  ["email", "ana@email.com", "email"],
  ["phone", "61999998888", "numbers"],
  ["link", "instagram.com/ana", "link"],
  ["profanity", "Porra", "profanity"],
]) {
  test(`rejects ${label} in nickname`, () => {
    assert.deepEqual(normalizeNickname(nickname), { allowed: false, nickname: "", reason });
  });
}

test("caps nicknames at twenty characters", () => {
  assert.equal(normalizeNickname("abcdefghijklmnopqrstuv").nickname, "abcdefghijklmnopqrst");
});

test("aura becomes static for reduced motion and hides after onboarding", () => {
  assert.deepEqual(onboardingAura({ active: true, reducedMotion: false }), { visible: true, pulse: true });
  assert.deepEqual(onboardingAura({ active: true, reducedMotion: true }), { visible: true, pulse: false });
  assert.deepEqual(onboardingAura({ active: false, reducedMotion: false }), { visible: false, pulse: false });
});
