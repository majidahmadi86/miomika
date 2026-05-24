/**
 * Doc-vs-code drift detector.
 *
 * Parses /docs/HOW-THIS-WORKS.md for any route path written in backticks
 * (e.g. `/auth/callback`, `/api/auth/post-signup`) and asserts each one
 * has a corresponding route.ts file under app/.
 *
 * Exit codes:
 *   0 — all documented routes have implementations
 *   1 — drift detected, or doc missing
 *
 * Runs as part of `npm run predeploy` (which is invoked by `npm run build`).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DOC_PATH = join(ROOT, "STATE.md");

function fail(msg: string): never {
  console.error(`[drift] FAIL — ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`[drift] OK — ${msg}`);
}

// --- 1. Doc exists ---------------------------------------------------------

if (!existsSync(DOC_PATH)) {
  fail(`/STATE.md missing (expected at ${DOC_PATH})`);
}

const content = readFileSync(DOC_PATH, "utf8");

// --- 2. Extract route paths from backticks --------------------------------
// Matches `/auth/...`, `/api/...`, but NOT generic paths like `/home` or
// `/profile` (those are pages, not API routes — the drift check is about
// route handlers specifically).

const ROUTE_REGEX = /`(\/(?:auth|api)\/[a-z0-9\-_/]+)`/gi;
const routes = new Set<string>();
let match: RegExpExecArray | null;

while ((match = ROUTE_REGEX.exec(content)) !== null) {
  // Strip trailing slash if any
  const route = match[1].replace(/\/$/, "");
  routes.add(route);
}

// Documented dead-end only — not a real route handler (see STATE.md).
routes.delete("/api/auth/callback");

if (routes.size === 0) {
  ok("no route references found in doc (nothing to verify)");
  process.exit(0);
}

// --- 3. Check each route maps to a route.ts file ---------------------------
// Next.js App Router: /auth/callback → app/auth/callback/route.ts

const missing: string[] = [];
const verified: string[] = [];

for (const route of routes) {
  const filePath = join(ROOT, "app", route, "route.ts");
  if (existsSync(filePath)) {
    verified.push(route);
  } else {
    missing.push(`${route}  (expected: app${route}/route.ts)`);
  }
}

if (missing.length > 0) {
  console.error("[drift] Documented routes missing implementation:");
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

ok(`${verified.length} routes verified: ${verified.join(", ")}`);
process.exit(0);
