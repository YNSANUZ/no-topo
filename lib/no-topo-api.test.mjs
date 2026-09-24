import test from "node:test";
import assert from "node:assert/strict";
import { createBidSession, fetchArenaState, fetchBidStatus, formatCents } from "./no-topo-api.mjs";

const API = "https://example.test/api";
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("builds public arena URL", async () => {
  let url = ""; await fetchArenaState(async (value) => { url = value; return response(200, { nextBidCents: 2000 }); }, API);
  assert.equal(url, `${API}/arena-state.php`);
});
test("propagates a stale bid with the server minimum", async () => {
  const fetchImpl = async () => response(409, { error: "Lance minimo atualizado.", nextBidCents: 6000 });
  await assert.rejects(createBidSession(fetchImpl, API, { amountCents: 4000 }), error => error.code === "bid_changed" && error.nextBidCents === 6000);
});
test("encodes reservation status URL", async () => {
  let url = ""; await fetchBidStatus(async (value) => { url = value; return response(200, { status: "pending" }); }, API, "a b");
  assert.equal(url, `${API}/bid-status.php?reservationId=a%20b`);
});
test("formats integer cents", () => assert.match(formatCents(2000), /20,00/));
test("maps network failures to recoverable error", async () => {
  await assert.rejects(fetchArenaState(async () => { throw new TypeError("offline"); }, API), error => error.code === "unavailable");
});
