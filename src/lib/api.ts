import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type output, type ZodTypeAny } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth";

/**
 * Shared helpers for route handlers: uniform JSON shapes, safe error
 * translation, and rate limiting for the AI endpoints.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Converts a thrown error into a response.
 *
 * Unrecognised errors deliberately return a generic message: an unexpected
 * error from the AI or database layer could otherwise carry provider detail,
 * a connection string, or a stack path into the client. The full error is
 * logged server-side instead.
 */
export function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return fail(error.message, 401);
  if (error instanceof ForbiddenError) return fail(error.message, 403);
  if (error instanceof ZodError) {
    const first = error.errors[0];
    return fail(first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.", 400);
  }

  console.error("[api] unhandled error:", error);
  return fail("Something went wrong on our side. Please try again.", 500);
}

/**
 * Parses and validates a JSON request body.
 *
 * Generic over the schema rather than over a value type, so the return type is
 * Zod's *output* type. That distinction matters: a field declared with
 * `.default(...)` is optional on input but always present on output, and
 * typing this against the input type would make every defaulted field
 * spuriously `| undefined` at every call site.
 */
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ZodError([
      { code: "custom", path: ["body"], message: "Expected a JSON request body." },
    ]);
  }
  return schema.parse(raw) as output<S>;
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * Fixed-window in-memory limiter, applied per user to the AI routes.
 *
 * This bounds the cost and blast radius of a compromised or over-enthusiastic
 * demo session: even a signed-in user cannot turn the deployment into a free
 * proxy for the platform's AI credits. It is per-instance rather than global,
 * so a horizontally-scaled production deployment would move this to Redis
 * (thesis §4.4 already specifies Redis in the data layer).
 */
const WINDOW_MS = 60_000;
const MAX_AI_CALLS_PER_WINDOW = 20;

const buckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many AI requests. Please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

export function enforceAiRateLimit(userId: string): void {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (bucket.count >= MAX_AI_CALLS_PER_WINDOW) {
    throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }

  bucket.count += 1;

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 500) {
    for (const [key, value] of buckets) {
      if (now >= value.resetAt) buckets.delete(key);
    }
  }
}

export function handleAiError(error: unknown) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  return handleError(error);
}
