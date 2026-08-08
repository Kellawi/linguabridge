import { z } from "zod";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z
  .object({
    titleAr: z.string().trim().max(300).default(""),
    titleEn: z.string().trim().max(300).default(""),
    summaryAr: z.string().trim().max(8000).default(""),
    summaryEn: z.string().trim().max(8000).default(""),
    deliverablesAr: z.array(z.string().trim().max(500)).max(20).default([]),
    deliverablesEn: z.array(z.string().trim().max(500)).max(20).default([]),
    skills: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    budgetAmount: z.number().nonnegative().max(10_000_000).nullable().default(null),
    budgetCurrency: z.string().trim().max(8).default("USD"),
    deadline: z.string().trim().max(200).nullable().default(null),
    sourceLang: z.enum(["ar", "en"]).default("ar"),
    completeness: z.number().int().min(0).max(100).default(0),
    status: z.enum(["draft", "open"]).default("open"),
    aiProvider: z.string().trim().max(20).nullable().default(null),
  })
  .refine((v) => v.titleAr.length > 0 || v.titleEn.length > 0, {
    message: "The job needs a title in at least one language.",
    path: ["titleEn"],
  });

/**
 * Publishes a job brief (§4.3.2). The employer reviews and edits the AI draft
 * before this endpoint is called — the generator never publishes directly.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole("employer");
    const input = await parseBody(request, schema);

    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO jobs (
        employer_id, title_ar, title_en, summary_ar, summary_en,
        deliverables_ar, deliverables_en, skills,
        budget_amount, budget_currency, deadline, source_lang, status, completeness, ai_provider
      ) VALUES (
        ${user.id}, ${input.titleAr}, ${input.titleEn}, ${input.summaryAr}, ${input.summaryEn},
        ${sql.json(input.deliverablesAr)}, ${sql.json(input.deliverablesEn)},
        ${sql.array(input.skills)},
        ${input.budgetAmount}, ${input.budgetCurrency}, ${input.deadline},
        ${input.sourceLang}, ${input.status}, ${input.completeness}, ${input.aiProvider}
      )
      RETURNING id
    `;

    return ok({ id: rows[0].id });
  } catch (error) {
    return handleError(error);
  }
}
