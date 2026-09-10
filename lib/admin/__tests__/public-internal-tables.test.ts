import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const INTERNAL_TABLES = ["content_briefs", "content_evidence"];

const SKIP_DIR_NAMES = new Set([
  "admin",
  "node_modules",
  ".git",
  "__tests__",
]);

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry)) {
      continue;
    }
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("internal research tables stay off the public path", () => {
  it("does not query content_briefs or content_evidence from public modules", () => {
    const files = [
      ...walk(path.join(ROOT, "app")),
      ...walk(path.join(ROOT, "components")),
      ...walk(path.join(ROOT, "lib/programs")),
      ...walk(path.join(ROOT, "lib/guides")),
      ...walk(path.join(ROOT, "lib/content")),
      ...walk(path.join(ROOT, "lib/eligibility")),
      ...walk(path.join(ROOT, "lib/seo")),
      ...walk(path.join(ROOT, "lib/analytics")),
      ...walk(path.join(ROOT, "lib/supabase")),
    ];
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const table of INTERNAL_TABLES) {
        if (text.includes(table)) {
          hits.push(`${path.relative(ROOT, file)}:${table}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
