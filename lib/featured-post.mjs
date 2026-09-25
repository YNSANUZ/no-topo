export const featuredPost = Object.freeze({
  rank: 1,
  username: "@brunoleaod",
  shortcode: "DV966NsjYCk",
  url: "https://www.instagram.com/reel/DV966NsjYCk/",
  bid: 120000,
  embedAvailable: true,
});

export function instagramEmbedUrl(shortcode) {
  return `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/embed/captioned/`;
}

export function instagramPreviewUrl(shortcode) {
  const source = `www.instagram.com/p/${encodeURIComponent(shortcode)}/media/?size=l`;
  return `https://images.weserv.nl/?url=${encodeURIComponent(source)}&output=jpg`;
}
