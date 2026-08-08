import { z } from "zod";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getConversationForMember, listGlossary } from "@/lib/repo";
import { handleError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  termEn: z.string().trim().min(1, "Enter the English term.").max(120),
  termAr: z.string().trim().min(1, "Enter the Arabic term.").max(120),
});

/**
 * The shared project glossary of §4.3.5, "editable by both parties", which
 * "ensures domain-specific consistency throughout the project". Terms added
 * here are injected into every subsequent translation for this conversation.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    await getConversationForMember(id, user.id); // membership check
    const { termEn, termAr } = await parseBody(request, schema);

    await sql`
      INSERT INTO glossary_terms (conversation_id, term_en, term_ar, created_by)
      VALUES (${id}, ${termEn}, ${termAr}, ${user.id})
      ON CONFLICT (conversation_id, term_en) DO UPDATE SET term_ar = EXCLUDED.term_ar
    `;

    return ok({ glossary: await listGlossary(id) });
  } catch (error) {
    return handleError(error);
  }
}
