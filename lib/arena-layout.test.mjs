import test from "node:test";
import assert from "node:assert/strict";

import { advanceToward, arenaView, clampArenaTarget, createPerimeterLights, createSeatLayout, entranceLayout, getCameraView, getNpcMotion, getSeatedCharacterRotation } from "./arena-layout.mjs";

test("keeps a clear ring between the central screens and the first seats", () => {
  const seats = createSeatLayout();
  const nearest = Math.min(...seats.map(({ radius }) => radius));

  assert.equal(nearest, 9.6);
});

test("aims every cinema seat toward the arena center", () => {
  const seats = createSeatLayout();

  for (const seat of seats) {
    const forwardX = -Math.sin(seat.rotationY);
    const forwardZ = -Math.cos(seat.rotationY);
    const towardCenterX = -seat.x / seat.radius;
    const towardCenterZ = -seat.z / seat.radius;

    assert.ok(Math.abs(forwardX - towardCenterX) < 1e-10);
    assert.ok(Math.abs(forwardZ - towardCenterZ) < 1e-10);
  }
});

test("turns Kenney characters toward the center instead of toward the seat back", () => {
  for (const seat of createSeatLayout()) {
    const characterRotation = getSeatedCharacterRotation(seat.rotationY);
    const faceX = Math.sin(characterRotation);
    const faceZ = Math.cos(characterRotation);
    assert.ok(Math.abs(faceX + seat.x / seat.radius) < 1e-10);
    assert.ok(Math.abs(faceZ + seat.z / seat.radius) < 1e-10);
  }
});

test("gives walking NPCs a loop and seated NPCs a subtle idle motion", () => {
  const walkingStart = getNpcMotion("walking", 0, 0);
  const walkingLater = getNpcMotion("walking", 1.5, 0);
  const seatedStart = getNpcMotion("seated", 0, 1);
  const seatedLater = getNpcMotion("seated", 1.5, 1);

  assert.notEqual(walkingStart.progress, walkingLater.progress);
  assert.ok(Math.abs(walkingLater.bob) > 0);
  assert.equal(seatedStart.progress, 0);
  assert.notEqual(seatedStart.bob, seatedLater.bob);
});

test("moves a player toward a clicked point without overshooting it", () => {
  const moving = advanceToward({ x: 0, z: 0 }, { x: 3, z: 4 }, 2);
  assert.ok(Math.abs(moving.x - 1.2) < 1e-10);
  assert.ok(Math.abs(moving.z - 1.6) < 1e-10);
  assert.equal(moving.arrived, false);
  assert.deepEqual(advanceToward({ x: 2.9, z: 3.9 }, { x: 3, z: 4 }, 2), {
    x: 3,
    z: 4,
    arrived: true,
  });
});

test("keeps clicked walking destinations inside the arena", () => {
  assert.deepEqual(clampArenaTarget({ x: 30, z: 0 }, 16.5), { x: 16.5, z: 0 });
  assert.deepEqual(clampArenaTarget({ x: 3, z: 4 }, 16.5), { x: 3, z: 4 });
});

test("frames the complete floating arena from a distant elevated camera", () => {
  assert.ok(Math.hypot(arenaView.camera.x, arenaView.camera.z) > 43);
  assert.ok(arenaView.camera.y >= 20);
  assert.ok(arenaView.fov >= 42);
});

test("leaves a centered cinema entrance through the outer ring", () => {
  assert.equal(entranceLayout.z, 18.2);
  assert.ok(entranceLayout.gap >= 3.4);
  assert.equal(entranceLayout.leftX, -entranceLayout.rightX);
});

test("distributes perimeter lights while preserving the front entrance", () => {
  const lights = createPerimeterLights(24, 18.15);
  assert.ok(lights.length >= 20);
  assert.ok(lights.every(({ x, z }) => Math.abs(Math.hypot(x, z) - 18.15) < 1e-10));
  assert.ok(lights.every(({ x, z }) => !(z > 17 && Math.abs(x) < 3)));
});

test("uses a wider mobile camera so the arena remains visible behind the controls", () => {
  const desktop = getCameraView(16 / 9);
  const mobile = getCameraView(9 / 16);
  assert.ok(mobile.fov > desktop.fov);
  assert.ok(mobile.z > desktop.z);
  assert.ok(desktop.x > 0);
});
