import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export const runtime = "nodejs";

/**
 * The employer accepts a proposal, which opens the shared bilingual workspace
 * (§4.3.5) for that job and freelancer.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("employer");
    const { id } = await context.params;

    // The join to `jobs` is what enforces ownership: an employer can only
    // accept proposals on jobs they themselves posted.
    const rows = await sql<Array<{ job_id: string; freelancer_id: string }>>`
      SELECT p.job_id, p.freelancer_id
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      WHERE p.id = ${id} AND j.employer_id = ${user.id}
    `;
    const proposal = rows[0];
    if (!proposal) return fail("Proposal not found.", 404);

    await sql`UPDATE proposals SET status = 'accepted' WHERE id = ${id}`;

    const conversation = await sql<Array<{ id: string }>>`
      INSERT INTO conversations (job_id, employer_id, freelancer_id)
      VALUES (${proposal.job_id}, ${user.id}, ${proposal.freelancer_id})
      ON CONFLICT (job_id, freelancer_id) DO UPDATE SET job_id = EXCLUDED.job_id
      RETURNING id
    `;

    return ok({ conversationId: conversation[0].id });
  } catch (error) {
    return handleError(error);
  }
}
