import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { checkBriefCompleteness } from "@/lib/ai/tasks";
import { enforceAiRateLimit, handleAiError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  title: z.string().trim().max(300).default(""),
  body: z.string().trim().min(20, "There is not enough text to check yet."),
  budget: z.string().trim().max(120).nullable().optional(),
  deadline: z.string().trim().max(200).nullable().optional(),
});

/** §4.3.2 constraint-completeness checker — prompts for gaps before publishing. */
export async function POST(request: Request) {
  try {
    const user = await requireRole("employer");
    enforceAiRateLimit(user.id);

    const input = await parseBody(request, schema);
    const { check, provider, degradedReason } = await checkBriefCompleteness(input);

    return ok({ check, provider, degradedReason });
  } catch (error) {
    return handleAiError(error);
  }
}
