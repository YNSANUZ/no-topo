import { featuredPost, foundingPodium } from "./featured-post.mjs";
import { DEFAULT_PROTECTION_RULES } from "./bid-outcome.mjs";

export const demoArenaView = Object.freeze({ featured: featuredPost, podium: foundingPodium, recentConquests: foundingPodium, nextBidCents: 2000, baseBidCents: 2000, incrementCents: 2000, protectionRules: DEFAULT_PROTECTION_RULES, protectedUntil: null, cycleEndsAt: null, biddingClosesAt: null });

export function arenaViewFromState(state, previous = demoArenaView) {
  if (!state || !Number.isInteger(state.nextBidCents) || !Array.isArray(state.ranking)) return previous;
  const podium = state.ranking.slice(0, 3).map((entry, index) => ({
    rank: index + 1,
    username: entry.nickname || `Visitante ${index + 1}`,
    shortcode: entry.shortcode || shortcodeFromUrl(entry.postUrl),
    url: entry.postUrl,
    bid: entry.amountCents,
    durationSeconds: Number.isInteger(entry.durationSeconds) ? entry.durationSeconds : null,
    approvedAt: entry.approvedAt || null,
    founding: false,
    embedAvailable: true,
  }));
  const recentConquests = state.ranking.length
    ? state.ranking.map((entry, index) => ({
        rank: index + 1,
        username: entry.nickname || `Visitante ${index + 1}`,
        shortcode: entry.shortcode || shortcodeFromUrl(entry.postUrl),
        url: entry.postUrl,
        bid: entry.amountCents,
        durationSeconds: Number.isInteger(entry.durationSeconds) ? entry.durationSeconds : null,
        approvedAt: entry.approvedAt || null,
        founding: false,
        embedAvailable: true,
      })).sort((left, right) => (right.approvedAt ? Date.parse(right.approvedAt) : 0) - (left.approvedAt ? Date.parse(left.approvedAt) : 0))
    : foundingPodium;
  const next = {
    featured: podium[0] || featuredPost,
    podium: podium.length ? podium : foundingPodium,
    recentConquests,
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
    && left.podium.every((entry, index) => sameEntry(entry, right.podium[index]))
    && left.recentConquests.length === right.recentConquests.length
    && left.recentConquests.every((entry, index) => sameEntry(entry, right.recentConquests[index]));
}

function sameEntry(left, right) {
  return left?.rank === right?.rank
    && left?.username === right?.username
    && left?.shortcode === right?.shortcode
    && left?.url === right?.url
    && left?.bid === right?.bid
    && left?.durationSeconds === right?.durationSeconds
    && left?.approvedAt === right?.approvedAt
    && left?.founding === right?.founding
    && left?.embedAvailable === right?.embedAvailable;
}

function shortcodeFromUrl(url = "") {
  return url.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] || featuredPost.shortcode;
}
