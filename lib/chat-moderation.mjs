const PROFANITY = ["caralho", "porra", "merda", "puta", "puto", "fdp", "cu", "buceta", "cacete"];

function normalize(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function moderateMessage(message) {
  const text = normalize(message);
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(message)) return { allowed: false, reason: "email" };
  if ((message.match(/\d/g) ?? []).length >= 5) return { allowed: false, reason: "numbers" };
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((word) => PROFANITY.includes(word))) return { allowed: false, reason: "profanity" };
  return { allowed: true, reason: null };
}
