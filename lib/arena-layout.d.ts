export const arenaView: Readonly<{
  camera: Readonly<{ x: number; y: number; z: number }>;
  fov: number;
}>;

export function getCameraView(aspect: number): { x: number; y: number; z: number; fov: number };

export const entranceLayout: Readonly<{
  z: number;
  gap: number;
  leftX: number;
  rightX: number;
}>;

export function createPerimeterLights(count?: number, radius?: number): Array<{
  angle: number;
  x: number;
  z: number;
}>;

export type SeatLayout = {
  angle: number;
  radius: number;
  rotationY: number;
  row: number;
  x: number;
  y: number;
  z: number;
};

export function createSeatLayout(options?: {
  rows?: number;
  firstRadius?: number;
  rowGap?: number;
}): SeatLayout[];

export function getSeatedCharacterRotation(seatRotation: number): number;

export function getNpcMotion(
  kind: "walking" | "seated",
  elapsed: number,
  phase?: number,
): { progress: number; bob: number; sway: number };

export function advanceToward(
  current: { x: number; z: number },
  target: { x: number; z: number },
  maxStep: number,
): { x: number; z: number; arrived: boolean };

export function clampArenaTarget(
  target: { x: number; z: number },
  maxRadius: number,
): { x: number; z: number };
