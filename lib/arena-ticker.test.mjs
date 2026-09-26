import test from "node:test";
import assert from "node:assert/strict";
import { buildArenaTicker } from "./arena-ticker.mjs";

test("summarizes the live leader, protection and next bid", () => {
  const message = buildArenaTicker({
    featured: { username: "@ana", bid: 8000 },
    nextBidCents: 10000,
    protectedUntil: "2026-09-25T21:42:00+00:00",
    cycleEndsAt: "2026-09-26T03:00:00+00:00",
  }, new Date("2026-09-25T21:30:00+00:00"));

  assert.equal(message, "● @ana conquistou o topo com R$ 80,00 • protegido até 18:42 • depois, o próximo lance começa em R$ 100,00");
});

test("announces when the protection has ended", () => {
  const message = buildArenaTicker({
    featured: { username: "@ana", bid: 8000 },
    nextBidCents: 10000,
    protectedUntil: "2026-09-25T21:20:00+00:00",
    cycleEndsAt: "2026-09-26T03:00:00+00:00",
  }, new Date("2026-09-25T21:30:00+00:00"));

  assert.equal(message, "● @ana conquistou o topo com R$ 80,00 • a proteção terminou • agora R$ 100,00 assume a tela • o mínimo cai R$ 20,00 por hora");
});

test("keeps the previous highlight while announcing that the minimum bid takes the screen", () => {
  const message = buildArenaTicker({
    featured: { username: "@brunoleaod", bid: 120000 },
    podium: [],
    nextBidCents: 2000,
    protectedUntil: null,
    cycleEndsAt: "2026-09-26T03:00:00+00:00",
  }, new Date("2026-09-25T21:30:00+00:00"));

  assert.equal(message, "● @brunoleaod conquistou o topo com R$ 1.200,00 • a proteção terminou • agora R$ 20,00 assume a tela e garante 10 minutos protegidos");
});
