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
  const next = {
    featured: podium[0] || featuredPost,
    podium,
    nextBidCents: state.nextBidCents,
    protectedUntil: state.protectedUntil || null,
  };
  return sameArenaView(next, previous) ? previous : next;
}

function sameArenaView(left, right) {
  return left.nextBidCents === right.nextBidCents
    && left.protectedUntil === right.protectedUntil
    && sameEntry(left.featured, right.featured)
    && left.podium.length === right.podium.length
    && left.podium.every((entry, index) => sameEntry(entry, right.podium[index]));
}

function sameEntry(left, right) {
  return left?.rank === right?.rank
    && left?.username === right?.username
    && left?.shortcode === right?.shortcode
    && left?.url === right?.url
    && left?.bid === right?.bid
    && left?.embedAvailable === right?.embedAvailable;
}

function shortcodeFromUrl(url = "") {
  return url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] || featuredPost.shortcode;
}
