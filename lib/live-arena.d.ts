export interface ArenaFeatured { rank: number; username: string; shortcode: string; url: string; bid: number; embedAvailable: boolean }
export interface ArenaView { featured: ArenaFeatured; podium: ArenaFeatured[]; nextBidCents: number; protectedUntil: string | null; cycleEndsAt: string | null }
export const demoArenaView: ArenaView;
export function arenaViewFromState(state: unknown, previous?: ArenaView): ArenaView;
