import test from "node:test";
import assert from "node:assert/strict";
import { arenaViewFromState, demoArenaView } from "./live-arena.mjs";

test("approved API ranking replaces the static featured post", () => {
  const view = arenaViewFromState({ nextBidCents: 6000, protectedUntil: null, ranking: [{ nickname: "Ana", postUrl: "https://www.instagram.com/reel/DV966NsjYCk/", shortcode: "DV966NsjYCk", amountCents: 4000 }] });
  assert.equal(view.featured.username, "Ana"); assert.equal(view.featured.bid, 4000); assert.equal(view.nextBidCents, 6000);
});
test("empty cycle keeps demonstration Reel", () => assert.equal(arenaViewFromState({ nextBidCents: 2000, ranking: [] }).featured.shortcode, demoArenaView.featured.shortcode));
test("bad refresh preserves last good view", () => {
  const last = { ...demoArenaView, nextBidCents: 6000 };
  assert.equal(arenaViewFromState(null, last), last);
});
