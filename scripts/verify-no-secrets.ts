/**
 * Build-output secret scanner.
 *
 *   npm run build && npm run verify:secrets
 *
 * The project's hard requirement is that AI provider keys never reach the
 * browser. Three separate mechanisms enforce that:
 *
 *   1. `import "server-only"` in src/lib/env.ts — the build FAILS if a client
 *      component ever pulls secrets into the client graph.
 *   2. No secret is named with a `NEXT_PUBLIC_` prefix, so Next.js has no
 *      reason to inline one.
 *   3. This script — a belt-and-braces check that greps the actual compiled
 *      client bundle for key-shaped strings and for the literal values in
 *      .env, in case a future change routes around 1 and 2.
 *
 * Exits non-zero on any finding, so it can gate CI and a deploy.
 */
import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

/** Directories that are shipped to, or readable by, the browser. */
const CLIENT_DIRS = [
  path.join(ROOT, ".next", "static"),
  path.join(ROOT, ".next", "server", "app"), // RSC payloads are client-visible
];

/** Provider key formats, by shape rather than by value. */
const KEY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "OpenAI secret key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { label: "OpenAI project key", pattern: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/ },
  { label: "Google API key", pattern: /\bAIza[A-Za-z0-9_-]{30,}\b/ },
  { label: "Postgres connection string", pattern: /\bpostgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/ },
];

/** Env vars whose literal values must never appear in client output. */
const SECRET_ENV_VARS = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "DATABASE_URL",
  "SESSION_SECRET",
];

const SCANNED_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".json", ".html", ".css", ".txt", ".rsc"]);

interface Finding {
  file: string;
  reason: string;
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // directory absent — nothing built yet for this target
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

async function main() {
  // Guard against a truncated or absent build being silently "clean".
  let built = false;
  for (const dir of CLIENT_DIRS) {
    try {
      await stat(dir);
      built = true;
    } catch {
      // keep checking the others
    }
  }

  if (!built) {
    console.error(
      "\n  No build output found. Run `npm run build` first — this check is\n" +
        "  meaningless without a compiled bundle to scan.\n",
    );
    process.exit(1);
  }

  const liveSecrets = SECRET_ENV_VARS.map((name) => ({ name, value: process.env[name] }))
    // Ignore short/placeholder values: an empty or 3-character value would
    // match everywhere and produce nothing but false positives.
    .filter((entry): entry is { name: string; value: string } => Boolean(entry.value && entry.value.length >= 12));

  const findings: Finding[] = [];
  let scanned = 0;

  for (const dir of CLIENT_DIRS) {
    for await (const file of walk(dir)) {
      scanned += 1;
      const content = await readFile(file, "utf8").catch(() => "");
      const relative = path.relative(ROOT, file);

      for (const { label, pattern } of KEY_PATTERNS) {
        if (pattern.test(content)) {
          findings.push({ file: relative, reason: `matches ${label} pattern` });
        }
      }

      for (const secret of liveSecrets) {
        if (content.includes(secret.value)) {
          findings.push({ file: relative, reason: `contains the literal value of ${secret.name}` });
        }
      }
    }
  }

  // Also confirm nobody has introduced a NEXT_PUBLIC_ alias for a secret.
  for (const name of SECRET_ENV_VARS) {
    if (process.env[`NEXT_PUBLIC_${name}`]) {
      findings.push({
        file: ".env",
        reason: `NEXT_PUBLIC_${name} is set — that prefix publishes the value to the browser`,
      });
    }
  }

  console.log(`Scanned ${scanned} client-visible files.`);
  console.log(
    liveSecrets.length > 0
      ? `Checked against ${liveSecrets.length} live secret value(s) from the environment.`
      : "No live secrets in the environment — pattern checks only.",
  );

  if (findings.length > 0) {
    console.error("\n  SECRET LEAK DETECTED\n");
    for (const finding of findings) {
      console.error(`  ${finding.file}\n      ${finding.reason}`);
    }
    console.error("\n  Do not deploy this build.\n");
    process.exit(1);
  }

  console.log("\nPASS — no secrets found in client-visible build output.\n");
}

void main();
