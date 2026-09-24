import { existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const clientDirectory = resolve("dist/client");
const nestedAssets = resolve(clientDirectory, "no-topo/_next");
const publicAssets = resolve(clientDirectory, "_next");

if (!existsSync(nestedAssets)) {
  throw new Error("GitHub Pages assets were not generated in dist/client/no-topo/_next.");
}

rmSync(publicAssets, { recursive: true, force: true });
renameSync(nestedAssets, publicAssets);
