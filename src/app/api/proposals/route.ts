import { z } from "zod";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fail, handleError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  jobId: z.string().uuid(),
  answers: z.record(z.string().max(4000)).default({}),
  bodyEn: z.string().trim().min(1, "The proposal is empty.").max(12000),
  bodyAr: z.string().trim().max(12000).default(""),
  aiProvider: z.string().trim().max(20).nullable().default(null),
});

/** Submits a proposal the freelancer has reviewed (§4.3.4). */
export async function POST(request: Request) {
  try {
    const user = await requireRole("freelancer");
    const input = await parseBody(request, schema);

    const jobs = await sql<Array<{ id: string }>>`
      SELECT id FROM jobs WHERE id = ${input.jobId} AND status = 'open'
    `;
    if (jobs.length === 0) return fail("That job is no longer accepting proposals.", 404);

    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO proposals (job_id, freelancer_id, answers, body_en, body_ar, status, ai_provider)
      VALUES (
        ${input.jobId}, ${user.id}, ${sql.json(input.answers)},
        ${input.bodyEn}, ${input.bodyAr}, 'submitted', ${input.aiProvider}
      )
      ON CONFLICT (job_id, freelancer_id) DO UPDATE SET
        answers = EXCLUDED.answers, body_en = EXCLUDED.body_en, body_ar = EXCLUDED.body_ar,
        status = 'submitted', ai_provider = EXCLUDED.ai_provider, created_at = now()
      RETURNING id
    `;

    return ok({ id: rows[0].id });
  } catch (error) {
    return handleError(error);
  }
}
