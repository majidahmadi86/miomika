/**
 * Writes deploy identity used by the service worker + client update checker.
 * Run before `next build` so every deploy gets a fresh sw.js + version.json.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function resolveBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  try {
    return execSync("git rev-parse --short=12 HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return `local-${Date.now().toString(36)}`;
  }
}

const buildId = resolveBuildId();
const builtAt = new Date().toISOString();

writeFileSync(
  join(root, "public", "version.json"),
  `${JSON.stringify({ buildId, builtAt }, null, 2)}\n`,
  "utf8",
);

const swSource = `/* Miomika service worker — SELF-DESTRUCT build, generated ${builtAt}
 *
 * The PWA cache layer MANUFACTURED the "please refresh" bug class: it cached
 * build files and purged them across deploys, stranding open pages. An online
 * AI companion needs no offline shell, so the worker is retired for good.
 * This build exists only to CLEAN UP every device that ever installed one:
 * it takes over immediately, deletes every cache, uninstalls itself, and gets
 * out of the way. New visitors never register a worker again (registration
 * removed from the app). Native app push (FCM) does not use this.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      // No clients.claim(): open pages keep running untouched on the network;
      // from their next navigation the worker is simply gone.
    })(),
  );
});

// No fetch handler: nothing is intercepted, nothing is cached, ever again.
`;

writeFileSync(join(root, "public", "sw.js"), swSource, "utf8");

console.log(`[build-version] buildId=${buildId}`);
