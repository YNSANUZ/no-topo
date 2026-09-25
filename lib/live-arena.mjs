import { featuredPost } from "./featured-post.mjs";
import { DEFAULT_PROTECTION_RULES } from "./bid-outcome.mjs";

export const demoArenaView = Object.freeze({ featured: featuredPost, podium: [], nextBidCents: 2000, baseBidCents: 2000, incrementCents: 2000, protectionRules: DEFAULT_PROTECTION_RULES, protectedUntil: null, cycleEndsAt: null, biddingClosesAt: null });

export function arenaViewFromState(state, previous = demoArenaView) {
  if (!state || !Number.isInteger(state.nextBidCents) || !Array.isArray(state.ranking)) return previous;
  const podium = state.ranking.slice(0, 3).map((entry, index) => ({
    rank: index + 1,
    username: entry.nickname || `Visitante ${index + 1}`,
    shortcode: entry.shortcode || shortcodeFromUrl(entry.postUrl),
    url: entry.postUrl,
    bid: entry.amountCents,
    durationSeconds: Number.isInteger(entry.durationSeconds) ? entry.durationSeconds : null,
    embedAvailable: true,
  }));
  const next = {
    featured: podium[0] || featuredPost,
    podium,
    nextBidCents: state.nextBidCents,
    baseBidCents: Number.isInteger(state.baseBidCents) ? state.baseBidCents : previous.baseBidCents,
    incrementCents: Number.isInteger(state.incrementCents) ? state.incrementCents : previous.incrementCents,
    protectionRules: state.protectionRules || previous.protectionRules,
    protectedUntil: state.protectedUntil || null,
    cycleEndsAt: state.cycle?.endsAt || null,
    biddingClosesAt: state.biddingClosesAt || null,
  };
  return sameArenaView(next, previous) ? previous : next;
}

function sameArenaView(left, right) {
  return left.nextBidCents === right.nextBidCents
    && left.baseBidCents === right.baseBidCents
    && left.incrementCents === right.incrementCents
    && left.protectionRules?.baseSeconds === right.protectionRules?.baseSeconds
    && left.protectionRules?.incrementSeconds === right.protectionRules?.incrementSeconds
    && left.protectionRules?.maxSeconds === right.protectionRules?.maxSeconds
    && left.protectedUntil === right.protectedUntil
    && left.cycleEndsAt === right.cycleEndsAt
    && left.biddingClosesAt === right.biddingClosesAt
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
    && left?.durationSeconds === right?.durationSeconds
    && left?.embedAvailable === right?.embedAvailable;
}

function shortcodeFromUrl(url = "") {
  return url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] || featuredPost.shortcode;
}
