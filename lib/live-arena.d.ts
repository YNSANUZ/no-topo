export interface ArenaFeatured { rank: number; username: string; shortcode: string; url: string; bid: number; durationSeconds?: number | null; approvedAt?: string | null; founding?: boolean; embedAvailable: boolean }
import type { ProtectionRules } from "./bid-outcome.mjs";
export interface ArenaView { featured: ArenaFeatured; podium: ArenaFeatured[]; recentConquests: ArenaFeatured[]; nextBidCents: number; baseBidCents: number; incrementCents: number; protectionRules: ProtectionRules; protectedUntil: string | null; cycleEndsAt: string | null; biddingClosesAt: string | null }
export const demoArenaView: ArenaView;
export function arenaViewFromState(state: unknown, previous?: ArenaView): ArenaView;
