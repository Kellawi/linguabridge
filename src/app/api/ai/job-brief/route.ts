import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { generateJobBrief } from "@/lib/ai/tasks";
import { enforceAiRateLimit, handleAiError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  rawText: z.string().trim().min(20, "Describe the work in at least a couple of sentences."),
});

/**
 * §4.3.2 Bilingual Job Brief Generator — the highest-ranked MVP feature in
 * thesis Table 4.2 (27.3%). Returns a draft; the employer edits and publishes.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole("employer");
    enforceAiRateLimit(user.id);

    const input = await parseBody(request, schema);
    const { draft, provider, degradedReason } = await generateJobBrief(input);

    return ok({ draft, provider, degradedReason });
  } catch (error) {
    return handleAiError(error);
  }
}
