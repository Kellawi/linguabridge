import "server-only";

/**
 * Central, server-only accessor for every secret this application uses.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `import "server-only"` above is the single most important line in the
 * codebase. If any client component (anything with `"use client"`) ever imports
 * this module — directly or through a chain of imports — the Next.js build
 * FAILS with a hard error rather than silently shipping a secret to the
 * browser. Secrets are therefore read here and nowhere else.
 *
 * Corollary rules, enforced by `npm run verify:secrets`:
 *   1. No secret is ever prefixed `NEXT_PUBLIC_` (that prefix is what tells
 *      Next.js to inline a value into the browser bundle).
 *   2. No key value is ever returned to the client, logged, or included in an
 *      error message. Only the booleans below cross that boundary.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in — see README "Local setup".`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },

  // --- AI provider secrets. Never leave the server. ---
  get openaiApiKey() {
    return optional("OPENAI_API_KEY");
  },
  get geminiApiKey() {
    return optional("GEMINI_API_KEY");
  },

  // --- Non-secret AI configuration. Safe to surface. ---
  get openaiModel() {
    return optional("OPENAI_MODEL") ?? "gpt-4o-mini";
  },
  get geminiModel() {
    return optional("GEMINI_MODEL") ?? "gemini-2.5-flash";
  },
  get aiMockMode() {
    return optional("AI_MOCK_MODE") === "true";
  },

  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
} as const;

/**
 * Describes AI availability WITHOUT revealing any key material. This is the
 * only AI-configuration data the browser is ever allowed to see: three
 * booleans and two public model names.
 */
export function aiStatus() {
  return {
    mockMode: env.aiMockMode,
    primaryConfigured: Boolean(env.openaiApiKey),
    backupConfigured: Boolean(env.geminiApiKey),
    primaryModel: env.openaiModel,
    backupModel: env.geminiModel,
  };
}

export type AiStatus = ReturnType<typeof aiStatus>;
