import test from "node:test";
import assert from "node:assert/strict";

import { moderateMessage } from "./chat-moderation.mjs";

test("accepts an ordinary arena message", () => {
  assert.deepEqual(moderateMessage("Que lance incrível!"), { allowed: true, reason: null });
});

test("blocks email addresses", () => {
  assert.deepEqual(moderateMessage("me chama em pessoa@site.com"), { allowed: false, reason: "email" });
});

test("blocks contact-like numeric sequences", () => {
  assert.deepEqual(moderateMessage("meu contato é 61999998888"), { allowed: false, reason: "numbers" });
});

test("blocks common Portuguese profanity even with mixed case", () => {
  assert.deepEqual(moderateMessage("Vai tomar no CU"), { allowed: false, reason: "profanity" });
});
