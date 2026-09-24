import test from "node:test";
import assert from "node:assert/strict";
import { checkoutReducer, initialCheckout, protectionRemaining } from "./bid-checkout.mjs";

test("moves from reservation to approval without storing payment form data", () => {
  const reserved = checkoutReducer(initialCheckout, { type: "reserved", reservationId: "abc" });
  const approved = checkoutReducer(reserved, { type: "status", status: "approved" });
  assert.equal(approved.step, "approved");
  assert.equal("formData" in approved, false);
});
test("keeps pending payments resumable", () => {
  const state = checkoutReducer({ ...initialCheckout, reservationId: "abc" }, { type: "status", status: "pending" });
  assert.equal(state.step, "pending");
});
test("shows rejected state", () => assert.equal(checkoutReducer(initialCheckout, { type: "status", status: "rejected" }).step, "rejected"));
test("calculates protection countdown", () => assert.equal(protectionRemaining("2026-09-24T12:10:00Z", Date.parse("2026-09-24T12:09:30Z")), 30));
