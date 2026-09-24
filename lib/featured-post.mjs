export const featuredPost = Object.freeze({
  rank: 1,
  username: "@brunoleaod",
  shortcode: "DV966NsjYCk",
  url: "https://www.instagram.com/reel/DV966NsjYCk/",
  bid: 0,
  embedAvailable: true,
});

export function instagramEmbedUrl(shortcode) {
  return `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/embed/captioned/`;
}
