import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VERSION_PATH = join(process.cwd(), "public", "version.json");

export function getBuildId(): string {
  if (!existsSync(VERSION_PATH)) return "dev";
  try {
    const parsed = JSON.parse(readFileSync(VERSION_PATH, "utf8")) as {
      buildId?: string;
    };
    return parsed.buildId ?? "dev";
  } catch {
    return "dev";
  }
}
