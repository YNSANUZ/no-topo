import test from "node:test";
import assert from "node:assert/strict";

import { featuredPost, foundingPodium, instagramEmbedUrl, instagramPreviewUrl } from "./featured-post.mjs";

test("uses the requested Instagram Reel as the first-place test post", () => {
  assert.equal(featuredPost.rank, 1);
  assert.equal(featuredPost.username, "@brunoleaod");
  assert.equal(featuredPost.shortcode, "DV966NsjYCk");
  assert.equal(featuredPost.url, "https://www.instagram.com/reel/DV966NsjYCk/");
  assert.equal(featuredPost.bid, 120000);
  assert.equal(featuredPost.embedAvailable, true);
});

test("builds the official Instagram embed URL for the featured Reel", () => {
  assert.equal(
    instagramEmbedUrl(featuredPost.shortcode),
    "https://www.instagram.com/reel/DV966NsjYCk/embed/captioned/",
  );
});

test("builds the stable public Instagram preview URL", () => {
  assert.equal(
    instagramPreviewUrl(featuredPost.shortcode),
    "https://images.weserv.nl/?url=www.instagram.com%2Fp%2FDV966NsjYCk%2Fmedia%2F%3Fsize%3Dl&output=jpg",
  );
});

test("defines three honest founding highlights without guest placeholders", () => {
  assert.deepEqual(foundingPodium.map((entry) => entry.username), ["@brunoleaod", "@primusdf", "@ursoninhos"]);
  assert.deepEqual(foundingPodium.map((entry) => entry.bid), [120000, 80000, 2000]);
  assert.ok(foundingPodium.every((entry) => entry.founding));
});
