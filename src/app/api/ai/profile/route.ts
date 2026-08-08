import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { buildBilingualProfile } from "@/lib/ai/tasks";
import { enforceAiRateLimit, handleAiError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  rawText: z.string().trim().min(20, "Write at least a couple of sentences about your work."),
  statedRate: z.string().trim().max(200).optional(),
});

/** §4.3.1 Bilingual Profile Engine — returns a DRAFT for the user to approve. */
export async function POST(request: Request) {
  try {
    const user = await requireRole("freelancer");
    enforceAiRateLimit(user.id);

    const input = await parseBody(request, schema);
    const { draft, provider, degradedReason } = await buildBilingualProfile(input);

    return ok({ draft, provider, degradedReason });
  } catch (error) {
    return handleAiError(error);
  }
}
