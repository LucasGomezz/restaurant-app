// MapLibre parses map tiles in a Web Worker that it loads from a URL next to
// its own file, which breaks once Next bundles it. So the worker (and the
// shared module it imports) are served from public/maplibre/ instead, and
// components/Map.tsx points MapLibre at them. Runs after every npm install,
// so the copy always matches the installed version.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "maplibre");

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(from, file), join(to, file));
}
