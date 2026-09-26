export const featuredPost = Object.freeze({
  rank: 1,
  username: "@brunoleaod",
  shortcode: "DV966NsjYCk",
  url: "https://www.instagram.com/reel/DV966NsjYCk/",
  bid: 120000,
  embedAvailable: true,
});

export const foundingPodium = Object.freeze([
  Object.freeze({ ...featuredPost, approvedAt: null, founding: true }),
  Object.freeze({ rank: 2, username: "@primusdf", shortcode: "", url: "https://www.instagram.com/primusdf/", bid: 80000, approvedAt: null, founding: true, embedAvailable: false }),
  Object.freeze({ rank: 3, username: "@ursoninhos", shortcode: "", url: "https://www.instagram.com/ursoninhos/", bid: 2000, approvedAt: null, founding: true, embedAvailable: false }),
]);

export function instagramEmbedUrl(shortcode) {
  return `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/embed/captioned/`;
}

export function instagramPreviewUrl(shortcode) {
  const source = `www.instagram.com/p/${encodeURIComponent(shortcode)}/media/?size=l`;
  return `https://images.weserv.nl/?url=${encodeURIComponent(source)}&output=jpg`;
}
