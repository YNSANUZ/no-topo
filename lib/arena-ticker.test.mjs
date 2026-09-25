import test from "node:test";
import assert from "node:assert/strict";
import { buildArenaTicker } from "./arena-ticker.mjs";

test("summarizes the live leader, protection, next bid and daily reset", () => {
  const message = buildArenaTicker({
    featured: { username: "@ana", bid: 8000 },
    nextBidCents: 10000,
    protectedUntil: "2026-09-25T21:42:00+00:00",
    cycleEndsAt: "2026-09-26T03:00:00+00:00",
  }, new Date("2026-09-25T21:30:00+00:00"));

  assert.equal(message, "● @ana lidera com R$ 80,00 • protegido até 18:42 • próximo lance mínimo R$ 100,00 • reset geral às 00:00");
});

test("announces when the protection has ended", () => {
  const message = buildArenaTicker({
    featured: { username: "@ana", bid: 8000 },
    nextBidCents: 10000,
    protectedUntil: "2026-09-25T21:20:00+00:00",
    cycleEndsAt: "2026-09-26T03:00:00+00:00",
  }, new Date("2026-09-25T21:30:00+00:00"));

  assert.match(message, /proteção encerrada • próximo lance mínimo R\$ 100,00/);
});
