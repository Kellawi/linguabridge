import { z } from "zod";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  headlineAr: z.string().trim().max(200).default(""),
  headlineEn: z.string().trim().max(200).default(""),
  bioAr: z.string().trim().max(6000).default(""),
  bioEn: z.string().trim().max(6000).default(""),
  skills: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  rateAmount: z.number().nonnegative().max(100000).nullable().default(null),
  rateCurrency: z.string().trim().max(8).nullable().default(null),
  rateUnit: z.enum(["hour", "project", "day"]).nullable().default(null),
  sourceLang: z.enum(["ar", "en"]).default("ar"),
  published: z.boolean().default(false),
  /** Recorded for transparency (design principle 3): which provider drafted this. */
  aiProvider: z.string().trim().max(20).nullable().default(null),
});

/**
 * Saves the freelancer's bilingual profile.
 *
 * This is the human-approval step of §4.3.1: the AI route produces a draft,
 * the freelancer edits it, and only this endpoint writes to the record. The AI
 * never publishes on the user's behalf.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole("freelancer");
    const input = await parseBody(request, schema);

    await sql`
      INSERT INTO freelancer_profiles (
        user_id, headline_ar, headline_en, bio_ar, bio_en, skills,
        rate_amount, rate_currency, rate_unit, source_lang, published, ai_provider, updated_at
      ) VALUES (
        ${user.id}, ${input.headlineAr}, ${input.headlineEn}, ${input.bioAr}, ${input.bioEn},
        ${sql.array(input.skills)}, ${input.rateAmount}, ${input.rateCurrency}, ${input.rateUnit},
        ${input.sourceLang}, ${input.published}, ${input.aiProvider}, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        headline_ar = EXCLUDED.headline_ar, headline_en = EXCLUDED.headline_en,
        bio_ar      = EXCLUDED.bio_ar,      bio_en      = EXCLUDED.bio_en,
        skills      = EXCLUDED.skills,      rate_amount = EXCLUDED.rate_amount,
        rate_currency = EXCLUDED.rate_currency, rate_unit = EXCLUDED.rate_unit,
        source_lang = EXCLUDED.source_lang, published   = EXCLUDED.published,
        ai_provider = EXCLUDED.ai_provider, updated_at  = now()
    `;

    return ok({ saved: true, published: input.published });
  } catch (error) {
    return handleError(error);
  }
}
