import test from "node:test";
import assert from "node:assert/strict";
import { roomGuideReply } from "./room-guide.mjs";

test("welcomes a visitor who greets the room", () => {
  assert.match(roomGuideReply("Oi pessoal", () => 0), /Bem-vindo/);
});

test("explains how to reach first place", () => {
  assert.match(roomGuideReply("Como fico em primeiro?", () => 0), /lance/);
});

test("keeps a generic reply relevant to the arena", () => {
  assert.match(roomGuideReply("Que ideia diferente", () => 0), /destaque/);
});
