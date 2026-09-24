export const arenaView = Object.freeze({
  camera: Object.freeze({ x: 12, y: 21, z: 42 }),
  fov: 44,
});

export function getCameraView(aspect) {
  if (aspect < 0.8) return { x: 7, y: 25, z: 52, fov: 56 };
  return { ...arenaView.camera, fov: arenaView.fov };
}

export const entranceLayout = Object.freeze({
  z: 18.2,
  gap: 3.8,
  leftX: -2.45,
  rightX: 2.45,
});

export function createPerimeterLights(count = 24, radius = 18.15) {
  const lights = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (z > 17 && Math.abs(x) < 3) continue;
    lights.push({ angle, x, z });
  }
  return lights;
}

export function createSeatLayout({ rows = 4, firstRadius = 9.6, rowGap = 2.45 } = {}) {
  const seats = [];

  for (let row = 0; row < rows; row += 1) {
    const radius = firstRadius + row * rowGap;
    const count = 22 + row * 6;

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      // Two wider radial aisles keep the circular room readable and traversable.
      if (Math.abs(Math.sin(angle)) < 0.14) continue;

      seats.push({
        angle,
        radius,
        rotationY: angle,
        row,
        x: Math.sin(angle) * radius,
        y: row * 0.58,
        z: Math.cos(angle) * radius,
      });
    }
  }

  return seats;
}

// The seat faces local -Z (its backrest is on +Z), while Kenney faces +Z.
export function getSeatedCharacterRotation(seatRotation) {
  return seatRotation + Math.PI;
}

export function getNpcMotion(kind, elapsed, phase = 0) {
  if (kind === "walking") {
    return {
      progress: (elapsed * 0.035 + phase * 0.17) % 1,
      bob: Math.abs(Math.sin(elapsed * 6 + phase)) * 0.11,
      sway: Math.sin(elapsed * 3 + phase) * 0.035,
    };
  }

  return {
    progress: 0,
    bob: Math.sin(elapsed * 1.7 + phase) * 0.025,
    sway: Math.sin(elapsed * 0.9 + phase) * 0.018,
  };
}

export function advanceToward(current, target, maxStep) {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const distance = Math.hypot(dx, dz);

  if (distance <= maxStep || distance === 0) {
    return { x: target.x, z: target.z, arrived: true };
  }

  const ratio = maxStep / distance;
  return {
    x: current.x + dx * ratio,
    z: current.z + dz * ratio,
    arrived: false,
  };
}

export function clampArenaTarget(target, maxRadius) {
  const distance = Math.hypot(target.x, target.z);
  if (distance <= maxRadius) return { x: target.x, z: target.z };
  const ratio = maxRadius / distance;
  return { x: target.x * ratio, z: target.z * ratio };
}
