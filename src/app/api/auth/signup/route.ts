import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, handleError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  role: z.enum(["employer", "freelancer"]),
  company: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  preferredLang: z.enum(["ar", "en"]).default("ar"),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, schema);
    const email = input.email.toLowerCase().trim();

    const existing = await sql<Array<{ id: string }>>`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existing.length > 0) {
      return fail("An account already exists for that email address.", 409);
    }

    const passwordHash = await hashPassword(input.password);

    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO users (email, password_hash, role, full_name, company, city, preferred_lang)
      VALUES (
        ${email}, ${passwordHash}, ${input.role}, ${input.fullName},
        ${input.role === "employer" ? input.company ?? null : null},
        ${input.city ?? null}, ${input.preferredLang}
      )
      RETURNING id
    `;
    const userId = rows[0].id;

    // Every freelancer gets an empty profile row so the profile builder has
    // somewhere to write its first draft.
    if (input.role === "freelancer") {
      await sql`
        INSERT INTO freelancer_profiles (user_id, source_lang)
        VALUES (${userId}, ${input.preferredLang})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }

    await createSession(userId);
    return ok({ role: input.role });
  } catch (error) {
    return handleError(error);
  }
}
