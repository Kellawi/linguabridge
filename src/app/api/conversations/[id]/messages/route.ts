import { z } from "zod";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { translateMessage } from "@/lib/ai/tasks";
import { getConversationForMember, listGlossary, listMessages } from "@/lib/repo";
import { enforceAiRateLimit, handleAiError, ok, parseBody } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  body: z.string().trim().min(1, "Write a message first.").max(4000),
});

/** Polled by the workspace to pick up the other party's messages. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    await getConversationForMember(id, user.id); // membership check
    const messages = await listMessages(id);

    return ok({ messages });
  } catch (error) {
    return handleAiError(error);
  }
}

/**
 * §4.3.5 Real-Time Chat Translation — ranked #2 in thesis Table 4.2 (21.8%).
 *
 * The message is stored exactly as typed, and the translation is stored
 * alongside it. The original is never replaced: both parties can always see
 * what was actually written, which is what makes the AI layer auditable rather
 * than a black box in the middle of a negotiation.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    await getConversationForMember(id, user.id); // membership check
    const { body } = await parseBody(request, schema);

    enforceAiRateLimit(user.id);

    const glossary = await listGlossary(id);
    const result = await translateMessage({
      text: body,
      glossary: glossary.map((g) => ({ term_en: g.term_en, term_ar: g.term_ar })),
    });

    const rows = await sql<Array<{ id: string; created_at: Date }>>`
      INSERT INTO messages (
        conversation_id, sender_id, body, source_lang, translated, target_lang, ai_provider
      ) VALUES (
        ${id}, ${user.id}, ${body}, ${result.sourceLang},
        ${result.translated}, ${result.targetLang}, ${result.provider}
      )
      RETURNING id, created_at
    `;

    return ok({
      message: {
        id: rows[0].id,
        conversation_id: id,
        sender_id: user.id,
        sender_name: user.fullName,
        body,
        source_lang: result.sourceLang,
        translated: result.translated,
        target_lang: result.targetLang,
        ai_provider: result.provider,
        created_at: rows[0].created_at,
      },
      degradedReason: result.degradedReason,
    });
  } catch (error) {
    return handleAiError(error);
  }
}
