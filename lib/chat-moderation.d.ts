export function moderateMessage(message: string): {
  allowed: boolean;
  reason: "email" | "numbers" | "profanity" | null;
};
