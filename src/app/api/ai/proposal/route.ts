import { z } from "zod";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { draftProposal } from "@/lib/ai/tasks";
import { enforceAiRateLimit, fail, handleAiError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  jobId: z.string().uuid(),
  answers: z.object({
    understanding: z.string().trim().min(1, "Answer the first question."),
    approach: z.string().trim().min(1, "Answer the second question."),
    timeline: z.string().trim().min(1, "Answer the third question."),
    pricing: z.string().trim().min(1, "Answer the fourth question."),
    experience: z.string().trim().min(1, "Answer the fifth question."),
  }),
});

/**
 * §4.3.4 Guided Proposal Writing Tool. Targets the lowest-scoring survey item
 * of all: confidence writing an English proposal, mean 2.29/5 (§5.3).
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole("freelancer");
    enforceAiRateLimit(user.id);

    const { jobId, answers } = await parseBody(request, schema);

    const jobs = await sql<Array<{ title_en: string; summary_en: string }>>`
      SELECT title_en, summary_en FROM jobs WHERE id = ${jobId} AND status = 'open'
    `;
    const job = jobs[0];
    if (!job) return fail("That job is no longer accepting proposals.", 404);

    const result = await draftProposal({
      answers,
      jobTitle: job.title_en,
      jobSummary: job.summary_en,
    });

    return ok(result);
  } catch (error) {
    return handleAiError(error);
  }
}
