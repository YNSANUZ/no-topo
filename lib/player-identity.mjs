import { moderateMessage } from "./chat-moderation.mjs";

export function createVisitorNickname(random = Math.random) {
  return `Visitante ${Math.floor(random() * 900) + 100}`;
}

export function normalizeNickname(value, fallback = "") {
  const raw = String(value ?? "").trim();
  if (!raw) return { allowed: true, nickname: fallback, reason: null };
  if (/(?:https?:\/\/|www\.|instagram\.com|tiktok\.com)/i.test(raw)) {
    return { allowed: false, nickname: "", reason: "link" };
  }
  const moderation = moderateMessage(raw);
  if (!moderation.allowed) return { allowed: false, nickname: "", reason: moderation.reason };
  return { allowed: true, nickname: raw.slice(0, 20), reason: null };
}

export function onboardingAura({ active, reducedMotion }) {
  return { visible: Boolean(active), pulse: Boolean(active && !reducedMotion) };
}
