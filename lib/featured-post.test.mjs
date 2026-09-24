import test from "node:test";
import assert from "node:assert/strict";

import { featuredPost, instagramEmbedUrl } from "./featured-post.mjs";

test("uses the requested Instagram Reel as the first-place test post", () => {
  assert.equal(featuredPost.rank, 1);
  assert.equal(featuredPost.username, "@brunoleaod");
  assert.equal(featuredPost.shortcode, "DV966NsjYCk");
  assert.equal(featuredPost.url, "https://www.instagram.com/reel/DV966NsjYCk/");
  assert.equal(featuredPost.embedAvailable, true);
});

test("builds the official Instagram embed URL for the featured Reel", () => {
  assert.equal(
    instagramEmbedUrl(featuredPost.shortcode),
    "https://www.instagram.com/reel/DV966NsjYCk/embed/captioned/",
  );
});
