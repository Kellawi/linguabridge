import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import type { Lang } from "@/lib/language";

/**
 * Mock authentication for the demonstration platform.
 *
 * "Mock" refers to the *account population* — the demo users are seeded
 * fixtures with published credentials, and there is no email verification,
 * password reset, or MFA. The mechanism itself is not mocked: passwords are
 * bcrypt-hashed, and the session is a signed JWT in an httpOnly cookie, so
 * the demo cannot be trivially escalated by editing a cookie value.
 *
 * A production deployment would add verification, rate-limited login, account
 * recovery, and audit logging before handling real users.
 */

export type Role = "employer" | "freelancer";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  company: string | null;
  city: string | null;
  preferredLang: Lang;
}

const COOKIE_NAME = "lb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, // not readable from JavaScript
    secure: env.isProduction, // HTTPS-only in production
    sameSite: "lax", // blocks cross-site CSRF on state-changing POSTs
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Returns the signed-in user, or null. Never throws on a bad/expired token. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    userId = payload.sub;
  } catch {
    return null; // tampered, expired, or signed with a rotated secret
  }

  const rows = await sql<
    Array<{
      id: string;
      email: string;
      role: Role;
      full_name: string;
      company: string | null;
      city: string | null;
      preferred_lang: Lang;
    }>
  >`
    SELECT id, email, role, full_name, company, city, preferred_lang
    FROM users
    WHERE id = ${userId}
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    company: row.company,
    city: row.city,
    preferredLang: row.preferred_lang,
  };
}

/** Session accessor for API routes. Throws `UnauthorizedError` when absent. */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new ForbiddenError(`This action is only available to ${role} accounts.`);
  }
  return user;
}
