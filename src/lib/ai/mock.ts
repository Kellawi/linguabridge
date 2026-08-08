import "server-only";

import { detectLang } from "@/lib/language";
import type { CompletionRequest } from "./provider";

/**
 * Deterministic offline stand-in for the AI services layer.
 *
 * Runs when no provider key is configured, when `AI_MOCK_MODE=true`, or when
 * both live providers fail. It exists so that the platform is fully explorable
 * — and so that the public demo and CI remain functional — without a key ever
 * being needed. Output is intentionally labelled so nobody mistakes mock text
 * for a real translation.
 */

export type MockKey =
  | "translate"
  | "profile"
  | "job-brief"
  | "brief-check"
  | "proposal"
  | "glossary";

const NOTE_EN = "[mock mode — configure an AI provider key for real output]";
const NOTE_AR = "[الوضع التجريبي — أضف مفتاح مزوّد الذكاء الاصطناعي للحصول على مخرجات حقيقية]";

function jsonMock(key: MockKey | undefined, user: string): string {
  const sourceLang = detectLang(user);
  const excerpt = user.trim().slice(0, 400);

  switch (key) {
    case "profile":
      return JSON.stringify({
        headline_en: `Software professional ${NOTE_EN}`,
        headline_ar: `محترف برمجيات ${NOTE_AR}`,
        bio_en: `${excerpt}\n\n${NOTE_EN}`,
        bio_ar: `${excerpt}\n\n${NOTE_AR}`,
        skills: ["JavaScript", "React", "Node.js", "REST APIs", "Git"],
        rate_amount: 15,
        rate_currency: "USD",
        rate_unit: "hour",
        notes_en: "Mock skill extraction. Review every field before publishing.",
        notes_ar: "استخراج تجريبي للمهارات. راجع كل حقل قبل النشر.",
      });

    case "job-brief":
      return JSON.stringify({
        title_en: `Project brief ${NOTE_EN}`,
        title_ar: `وصف المشروع ${NOTE_AR}`,
        summary_en: `${excerpt}\n\n${NOTE_EN}`,
        summary_ar: `${excerpt}\n\n${NOTE_AR}`,
        deliverables_en: ["Deliverable 1", "Deliverable 2"],
        deliverables_ar: ["المُخرج الأول", "المُخرج الثاني"],
        skills: ["Web Development"],
        source_lang: sourceLang,
      });

    case "brief-check":
      return JSON.stringify({
        completeness: 60,
        missing: [
          {
            field: "budget",
            question_en: "What is the budget range for this project?",
            question_ar: "ما هو النطاق المالي لهذا المشروع؟",
          },
          {
            field: "deadline",
            question_en: "When must the work be delivered?",
            question_ar: "متى يجب تسليم العمل؟",
          },
        ],
        note_en: NOTE_EN,
        note_ar: NOTE_AR,
      });

    case "glossary":
      return JSON.stringify({ terms: [] });

    default:
      return JSON.stringify({ text_en: `${excerpt} ${NOTE_EN}`, text_ar: `${excerpt} ${NOTE_AR}` });
  }
}

export function mockCompletion(req: CompletionRequest): string {
  if (req.json) return jsonMock(req.mockKey, req.user);

  const sourceLang = detectLang(req.user);
  const note = sourceLang === "ar" ? NOTE_EN : NOTE_AR;

  if (req.mockKey === "proposal") {
    return [
      "Dear Client,",
      "",
      req.user.trim().slice(0, 600),
      "",
      "I would be glad to discuss the details further.",
      "",
      note,
    ].join("\n");
  }

  // Default: a pass-through "translation" that is clearly marked as mock.
  return `${req.user.trim()}\n\n${note}`;
}
