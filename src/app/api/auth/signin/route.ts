import { z } from "zod";
import { sql } from "@/lib/db";
import { createSession, verifyPassword, type Role } from "@/lib/auth";
import { fail, handleError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function POST(request: Request) {
  try {
    const { email, password } = await parseBody(request, schema);

    const rows = await sql<Array<{ id: string; password_hash: string; role: Role }>>`
      SELECT id, password_hash, role FROM users WHERE email = ${email.toLowerCase().trim()}
    `;
    const user = rows[0];

    // Deliberately identical response whether the email is unknown or the
    // password is wrong, so the endpoint cannot be used to enumerate accounts.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return fail("Incorrect email or password.", 401);
    }

    await createSession(user.id);
    return ok({ role: user.role });
  } catch (error) {
    return handleError(error);
  }
}
