import "server-only";

import postgres from "postgres";
import { env } from "@/lib/env";

/**
 * PostgreSQL access layer (thesis §4.4: "PostgreSQL for structured data").
 *
 * Uses postgres.js, whose tagged-template API parameterises every interpolated
 * value automatically — `sql\`... where id = ${id}\`` sends `id` as a bound
 * parameter, not as concatenated SQL. This is the project's primary defence
 * against SQL injection; do not build queries with string concatenation.
 *
 * The exported `sql` is a lazy proxy. Connecting eagerly at module load would
 * mean that merely importing this file threw when DATABASE_URL is unset —
 * which would break `npm run build` and, worse, take down the very setup
 * screen that tells a new user to set DATABASE_URL. The connection is opened
 * on first actual use instead.
 *
 * The client is cached on `globalThis` so Next.js hot reloads in development,
 * and re-used serverless invocations in production, do not open a new pool
 * every time.
 */

declare global {
  var __linguabridgeSql: postgres.Sql | undefined;
}

let client: postgres.Sql | undefined;

function getClient(): postgres.Sql {
  if (client) return client;

  client =
    globalThis.__linguabridgeSql ??
    postgres(env.databaseUrl, {
      // Serverless platforms give each invocation a short-lived container, so
      // a small pool with an aggressive idle timeout avoids exhausting
      // Postgres connection slots.
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false, // required for transaction-pooling proxies (Supabase :6543)
      onnotice: () => {},
    });

  if (!env.isProduction) globalThis.__linguabridgeSql = client;
  return client;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const sql: postgres.Sql = new Proxy(function () {} as unknown as postgres.Sql, {
  // Tagged-template usage: sql`SELECT ...`
  apply(_target, _thisArg, args: unknown[]) {
    return (getClient() as any)(...args);
  },
  // Helper usage: sql.json(...), sql.array(...), sql.unsafe(...), sql.end()
  get(_target, property) {
    const value = (getClient() as any)[property];
    return typeof value === "function" ? value.bind(getClient()) : value;
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * True when DATABASE_URL is present. Checked before touching `sql` so that a
 * missing configuration renders the setup screen instead of a stack trace.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
