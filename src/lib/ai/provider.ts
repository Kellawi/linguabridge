import "server-only";

import { env } from "@/lib/env";
import { mockCompletion, type MockKey } from "./mock";

/**
 * Provider abstraction for the AI services layer described in thesis §4.4.
 *
 * Chain of responsibility:
 *   1. OpenAI GPT-4o-mini   (primary)
 *   2. Google Gemini 2.5 Flash (backup — used on error, rate limit, or timeout)
 *   3. Deterministic mock    (used when neither key is configured)
 *
 * Every call in this module runs exclusively on the server. API keys are read
 * from `@/lib/env`, which is marked `server-only`, and are placed only into
 * outbound request headers to the provider — never into a response body, a
 * log line, or an error message.
 */

export type AiProvider = "openai" | "gemini" | "mock";

export interface CompletionRequest {
  /** System / instruction prompt. */
  system: string;
  /** User content to act on. */
  user: string;
  /** Identifies the task so the deterministic mock can shape its output. */
  mockKey?: MockKey;
  /** When true, ask the model for a JSON object and parse it. */
  json?: boolean;
  /** Sampling temperature. Low by default — this is a translation tool. */
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  text: string;
  provider: AiProvider;
  /** Populated when the primary provider failed and the backup was used. */
  degradedReason?: string;
}

const TIMEOUT_MS = 30_000;

/** Strips anything that looks like a credential out of an error string. */
function scrub(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]");
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Primary: OpenAI GPT-4o-mini
// ---------------------------------------------------------------------------

async function callOpenAI(req: CompletionRequest, apiKey: string): Promise<string> {
  const response = await withTimeout((signal) =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        // The only place the key is ever used.
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 1500,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
      }),
    }),
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${response.status}: ${scrub(detail).slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned an empty completion.");
  return text;
}

// ---------------------------------------------------------------------------
// Backup: Google Gemini 2.5 Flash
// ---------------------------------------------------------------------------

async function callGemini(req: CompletionRequest, apiKey: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(env.geminiModel)}:generateContent`;

  const response = await withTimeout((signal) =>
    fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        // Header auth (not a query string) so the key cannot leak into
        // server access logs or proxy request lines.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.user }] }],
        generationConfig: {
          temperature: req.temperature ?? 0.2,
          maxOutputTokens: req.maxTokens ?? 1500,
          ...(req.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }),
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini HTTP ${response.status}: ${scrub(detail).slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned an empty completion.");
  return text;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function complete(req: CompletionRequest): Promise<CompletionResult> {
  const openaiKey = env.openaiApiKey;
  const geminiKey = env.geminiApiKey;

  if (env.aiMockMode || (!openaiKey && !geminiKey)) {
    return { text: mockCompletion(req), provider: "mock" };
  }

  let primaryError: string | undefined;

  if (openaiKey) {
    try {
      return { text: await callOpenAI(req, openaiKey), provider: "openai" };
    } catch (error) {
      primaryError = scrub(error instanceof Error ? error.message : String(error));
      console.warn("[ai] primary provider failed, falling back:", primaryError);
    }
  }

  if (geminiKey) {
    try {
      return {
        text: await callGemini(req, geminiKey),
        provider: "gemini",
        degradedReason: primaryError,
      };
    } catch (error) {
      const backupError = scrub(error instanceof Error ? error.message : String(error));
      console.warn("[ai] backup provider failed, using mock:", backupError);
      return {
        text: mockCompletion(req),
        provider: "mock",
        degradedReason: primaryError ?? backupError,
      };
    }
  }

  return { text: mockCompletion(req), provider: "mock", degradedReason: primaryError };
}

/**
 * Convenience wrapper for prompts that must return structured JSON. Tolerates
 * models that wrap JSON in a markdown fence.
 */
export async function completeJson<T>(
  req: Omit<CompletionRequest, "json">,
  fallback: T,
): Promise<{ value: T; provider: AiProvider; degradedReason?: string }> {
  const result = await complete({ ...req, json: true });
  const cleaned = result.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return {
      value: JSON.parse(cleaned) as T,
      provider: result.provider,
      degradedReason: result.degradedReason,
    };
  } catch {
    console.warn("[ai] could not parse JSON response; using structured fallback.");
    return { value: fallback, provider: result.provider, degradedReason: "unparseable-json" };
  }
}
