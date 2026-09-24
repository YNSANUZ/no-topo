export type NicknameResult = { allowed: boolean; nickname: string; reason: string | null };
export function createVisitorNickname(random?: () => number): string;
export function normalizeNickname(value: unknown, fallback?: string): NicknameResult;
export function onboardingAura(input: { active: boolean; reducedMotion: boolean }): { visible: boolean; pulse: boolean };
