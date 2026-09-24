import { featuredPost } from "./featured-post.mjs";

export const demoArenaView = Object.freeze({ featured: featuredPost, podium: [], nextBidCents: 2000, protectedUntil: null });

export function arenaViewFromState(state, previous = demoArenaView) {
  if (!state || !Number.isInteger(state.nextBidCents) || !Array.isArray(state.ranking)) return previous;
  const podium = state.ranking.slice(0, 3).map((entry, index) => ({
    rank: index + 1,
    username: entry.nickname || `Visitante ${index + 1}`,
    shortcode: entry.shortcode || shortcodeFromUrl(entry.postUrl),
    url: entry.postUrl,
    bid: entry.amountCents,
    embedAvailable: true,
  }));
  return {
    featured: podium[0] || featuredPost,
    podium,
    nextBidCents: state.nextBidCents,
    protectedUntil: state.protectedUntil || null,
  };
}

function shortcodeFromUrl(url = "") {
  return url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] || featuredPost.shortcode;
}
