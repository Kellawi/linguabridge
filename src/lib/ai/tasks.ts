import "server-only";

import { detectLang, otherLang, type Lang } from "@/lib/language";
import { complete, completeJson, type AiProvider } from "./provider";

/**
 * The AI components of thesis §4.3, implemented as typed server-side tasks.
 *
 * Every task honours design principle 2 — "AI assistance rather than
 * replacement". Each returns a *draft* that the human edits and approves; no
 * task writes directly to a published record. Principle 3 — transparency — is
 * honoured by returning the `provider` that produced each result so the UI can
 * label AI-generated content.
 */

export interface TaskMeta {
  provider: AiProvider;
  degradedReason?: string;
}

const HOUSE_STYLE = `You are LinguaBridge, an AI language layer for a bilingual Arabic/English
freelancing platform serving Arabic-speaking professionals in Jordan.

Rules you must always follow:
- Arabic and English are equal first-class languages. Never treat English as
  the "real" version and Arabic as a translation of it, or vice versa.
- Preserve the author's meaning, seniority level and intent exactly. Never
  inflate claims, invent experience, add qualifications, or add technologies
  the author did not mention.
- Keep widely-used technical terms in Latin script (React, PostgreSQL, API,
  Figma). Do not transliterate them into Arabic script.
- Use Modern Standard Arabic. Render Levantine/Jordanian colloquial input into
  clear MSA without changing what was said.
- Write natural professional English, not word-for-word translation. The point
  is that the author reads as the competent professional they are.
- If the input is empty or meaningless, say so rather than inventing content.`;

// ---------------------------------------------------------------------------
// §4.3.1 Bilingual Profile Engine
// ---------------------------------------------------------------------------

export interface ProfileDraft {
  headline_en: string;
  headline_ar: string;
  bio_en: string;
  bio_ar: string;
  skills: string[];
  rate_amount: number | null;
  rate_currency: string | null;
  rate_unit: "hour" | "project" | "day" | null;
  notes_en: string;
  notes_ar: string;
}

/**
 * Translation + skill auto-tagging + rate normalisation, per thesis §4.3.1.
 * The freelancer writes freely in Arabic (or English); this produces both
 * sides plus canonical skill labels for matching.
 */
export async function buildBilingualProfile(input: {
  rawText: string;
  statedRate?: string;
}): Promise<{ draft: ProfileDraft } & TaskMeta> {
  const sourceLang = detectLang(input.rawText);

  const system = `${HOUSE_STYLE}

TASK: Build a bilingual freelancer profile.

Given the freelancer's own description of themselves, produce:
1. A professional headline in BOTH languages (max 90 characters each).
2. A polished bio in BOTH languages (2-4 short paragraphs each).
3. Canonical skill tags extracted from the text — 4 to 12 of them. Use the
   standard industry name for each skill in English Latin script, exactly as
   an employer would search for it. Only include skills genuinely evidenced by
   the text.
4. Rate normalisation: if a rate is stated in any form (including informal
   phrasing such as "حوالي ١٠ دنانير بالساعة"), convert it into a numeric
   amount, an ISO currency code, and a unit of "hour", "project" or "day".
   If no rate is stated, return null for all three rate fields. Never guess.
5. A short reviewer note in both languages telling the freelancer what you
   changed or what they should double-check.

Return ONLY a JSON object with these exact keys:
headline_en, headline_ar, bio_en, bio_ar, skills (array of strings),
rate_amount (number or null), rate_currency (string or null),
rate_unit (string or null), notes_en, notes_ar`;

  const user = [
    `Author's language: ${sourceLang === "ar" ? "Arabic" : "English"}`,
    "",
    "--- FREELANCER'S OWN DESCRIPTION ---",
    input.rawText,
    input.statedRate ? `\n--- STATED RATE ---\n${input.statedRate}` : "",
  ].join("\n");

  const fallback: ProfileDraft = {
    headline_en: "",
    headline_ar: "",
    bio_en: input.rawText,
    bio_ar: input.rawText,
    skills: [],
    rate_amount: null,
    rate_currency: null,
    rate_unit: null,
    notes_en: "Automatic profile generation failed. Please fill the fields manually.",
    notes_ar: "فشل توليد الملف الشخصي تلقائياً. يرجى تعبئة الحقول يدوياً.",
  };

  const { value, provider, degradedReason } = await completeJson<ProfileDraft>(
    { system, user, mockKey: "profile", temperature: 0.3, maxTokens: 1800 },
    fallback,
  );

  return { draft: normaliseProfile(value, fallback), provider, degradedReason };
}

function normaliseProfile(value: ProfileDraft, fallback: ProfileDraft): ProfileDraft {
  const unit = value.rate_unit;
  return {
    headline_en: String(value.headline_en ?? "").slice(0, 200),
    headline_ar: String(value.headline_ar ?? "").slice(0, 200),
    bio_en: String(value.bio_en ?? fallback.bio_en),
    bio_ar: String(value.bio_ar ?? fallback.bio_ar),
    skills: Array.isArray(value.skills)
      ? [...new Set(value.skills.map((s) => String(s).trim()).filter(Boolean))].slice(0, 12)
      : [],
    rate_amount: typeof value.rate_amount === "number" ? value.rate_amount : null,
    rate_currency: value.rate_currency ? String(value.rate_currency).slice(0, 8) : null,
    rate_unit: unit === "hour" || unit === "project" || unit === "day" ? unit : null,
    notes_en: String(value.notes_en ?? ""),
    notes_ar: String(value.notes_ar ?? ""),
  };
}

// ---------------------------------------------------------------------------
// §4.3.2 Bilingual Job Brief Generator
// ---------------------------------------------------------------------------

export interface JobBriefDraft {
  title_en: string;
  title_ar: string;
  summary_en: string;
  summary_ar: string;
  deliverables_en: string[];
  deliverables_ar: string[];
  skills: string[];
  source_lang: Lang;
}

/**
 * Ranked #1 in thesis Table 4.2 (27.3% of respondents named it their single
 * most valuable feature). Turns a free-text brief in either language into a
 * structured bilingual specification.
 */
export async function generateJobBrief(input: {
  rawText: string;
}): Promise<{ draft: JobBriefDraft } & TaskMeta> {
  const sourceLang = detectLang(input.rawText);

  const system = `${HOUSE_STYLE}

TASK: Turn a free-text job description into a structured bilingual specification.

Produce:
1. A concise job title in BOTH languages (max 80 characters each).
2. A structured summary in BOTH languages covering context, scope and
   expectations. Use short paragraphs. Do not invent budget, deadline or any
   constraint that the author did not state.
3. A list of concrete deliverables in BOTH languages. The two arrays MUST have
   the same length and the same order — item i in each array is the same
   deliverable expressed in the two languages.
4. Canonical skill tags an employer would search for (English, Latin script),
   3 to 8 of them.

Return ONLY a JSON object with these exact keys:
title_en, title_ar, summary_en, summary_ar,
deliverables_en (array), deliverables_ar (array), skills (array)`;

  const fallback: JobBriefDraft = {
    title_en: "",
    title_ar: "",
    summary_en: input.rawText,
    summary_ar: input.rawText,
    deliverables_en: [],
    deliverables_ar: [],
    skills: [],
    source_lang: sourceLang,
  };

  const { value, provider, degradedReason } = await completeJson<JobBriefDraft>(
    {
      system,
      user: `Author's language: ${sourceLang === "ar" ? "Arabic" : "English"}\n\n--- RAW JOB DESCRIPTION ---\n${input.rawText}`,
      mockKey: "job-brief",
      temperature: 0.3,
      maxTokens: 1800,
    },
    fallback,
  );

  const en = Array.isArray(value.deliverables_en) ? value.deliverables_en.map(String) : [];
  const ar = Array.isArray(value.deliverables_ar) ? value.deliverables_ar.map(String) : [];
  // Keep the two arrays index-aligned; a mismatch would pair the wrong strings.
  const pairCount = Math.min(en.length, ar.length);

  return {
    draft: {
      title_en: String(value.title_en ?? "").slice(0, 200),
      title_ar: String(value.title_ar ?? "").slice(0, 200),
      summary_en: String(value.summary_en ?? fallback.summary_en),
      summary_ar: String(value.summary_ar ?? fallback.summary_ar),
      deliverables_en: en.slice(0, pairCount),
      deliverables_ar: ar.slice(0, pairCount),
      skills: Array.isArray(value.skills)
        ? [...new Set(value.skills.map((s) => String(s).trim()).filter(Boolean))].slice(0, 8)
        : [],
      source_lang: sourceLang,
    },
    provider,
    degradedReason,
  };
}

// ---------------------------------------------------------------------------
// §4.3.2 Constraint-completeness checker
// ---------------------------------------------------------------------------

export interface BriefCheck {
  completeness: number;
  missing: Array<{ field: string; question_en: string; question_ar: string }>;
  note_en: string;
  note_ar: string;
}

/**
 * Prompts the author to fill gaps (budget, deadline, deliverable format)
 * before publication — thesis §4.3.2, addressing the 7.3% of survey
 * respondents who cited unclear job descriptions as their main barrier.
 */
export async function checkBriefCompleteness(input: {
  title: string;
  body: string;
  budget?: string | null;
  deadline?: string | null;
}): Promise<{ check: BriefCheck } & TaskMeta> {
  const system = `${HOUSE_STYLE}

TASK: Audit a job brief for missing constraints before it is published.

Check whether the brief states each of: budget or budget range; deadline or
timeline; required deliverable format; scope boundaries (what is explicitly
NOT included); required skills or experience level; and the review/acceptance
criteria.

Return ONLY a JSON object:
- "completeness": integer 0-100 estimating how ready this brief is to publish.
- "missing": array (max 5) of objects with "field" (one of: budget, deadline,
  format, scope, skills, acceptance), "question_en" and "question_ar" — a
  single direct question prompting the author to supply what is missing.
- "note_en" and "note_ar": one sentence of overall guidance.

If nothing important is missing, return an empty "missing" array.`;

  const user = [
    `TITLE: ${input.title}`,
    `BUDGET FIELD: ${input.budget || "(not provided)"}`,
    `DEADLINE FIELD: ${input.deadline || "(not provided)"}`,
    "",
    "--- BRIEF BODY ---",
    input.body,
  ].join("\n");

  const fallback: BriefCheck = {
    completeness: 0,
    missing: [],
    note_en: "Completeness check unavailable.",
    note_ar: "فحص اكتمال الوصف غير متاح.",
  };

  const { value, provider, degradedReason } = await completeJson<BriefCheck>(
    { system, user, mockKey: "brief-check", temperature: 0.1, maxTokens: 900 },
    fallback,
  );

  const raw = Number(value.completeness);
  return {
    check: {
      completeness: Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0,
      missing: Array.isArray(value.missing) ? value.missing.slice(0, 5) : [],
      note_en: String(value.note_en ?? ""),
      note_ar: String(value.note_ar ?? ""),
    },
    provider,
    degradedReason,
  };
}

// ---------------------------------------------------------------------------
// §4.3.4 Guided Proposal Writing Tool
// ---------------------------------------------------------------------------

/** The structured Arabic-language framework the freelancer answers. */
export interface ProposalAnswers {
  understanding: string;
  approach: string;
  timeline: string;
  pricing: string;
  experience: string;
}

/**
 * Addresses the lowest-scoring item in the entire survey: confidence writing
 * an English proposal, mean 2.29/5 (thesis §5.3). The freelancer answers five
 * prompts in their own language; this assembles a professional English
 * proposal that they then review and edit before sending.
 */
export async function draftProposal(input: {
  answers: ProposalAnswers;
  jobTitle: string;
  jobSummary: string;
}): Promise<{ proposalEn: string; proposalAr: string } & TaskMeta> {
  const system = `${HOUSE_STYLE}

TASK: Assemble a professional English freelance proposal from the applicant's
structured answers, then provide a faithful Arabic version of that same
proposal so the applicant can verify what is being sent on their behalf.

Requirements:
- Address the client's stated needs directly. Open with understanding of the
  problem, not with a greeting about yourself.
- Cover, in order: understanding of the project, proposed approach, timeline,
  pricing, and relevant experience.
- 180-320 words. Confident and specific, never boastful or servile.
- Use ONLY facts from the applicant's answers. If an answer is thin, keep that
  section short — never pad it with invented experience or fake metrics.
- No placeholder text, no "[insert X here]", no markdown headings.

Return your reply as exactly two sections separated by a line containing only
"---ARABIC---":
the English proposal, then the separator line, then the Arabic version.`;

  const user = [
    `JOB TITLE: ${input.jobTitle}`,
    `JOB SUMMARY: ${input.jobSummary}`,
    "",
    "--- APPLICANT'S ANSWERS (in their own words) ---",
    `1. My understanding of the project: ${input.answers.understanding}`,
    `2. How I would approach it: ${input.answers.approach}`,
    `3. Timeline: ${input.answers.timeline}`,
    `4. Pricing: ${input.answers.pricing}`,
    `5. Relevant experience: ${input.answers.experience}`,
  ].join("\n");

  const result = await complete({
    system,
    user,
    mockKey: "proposal",
    temperature: 0.4,
    maxTokens: 1400,
  });

  const [enPart, arPart] = result.text.split(/^\s*-{3}ARABIC-{3}\s*$/m);

  return {
    proposalEn: (enPart ?? result.text).trim(),
    proposalAr: (arPart ?? "").trim(),
    provider: result.provider,
    degradedReason: result.degradedReason,
  };
}

// ---------------------------------------------------------------------------
// §4.3.5 Real-Time Chat Translation with shared glossary
// ---------------------------------------------------------------------------

export interface GlossaryTerm {
  term_en: string;
  term_ar: string;
}

/**
 * Ranked #2 in thesis Table 4.2 (21.8%). Translates a chat message into the
 * counterpart language, honouring the project's shared glossary so that
 * domain terminology stays consistent for the life of the project.
 */
export async function translateMessage(input: {
  text: string;
  glossary: GlossaryTerm[];
}): Promise<{ translated: string; sourceLang: Lang; targetLang: Lang } & TaskMeta> {
  const sourceLang = detectLang(input.text);
  const targetLang = otherLang(sourceLang);

  const glossaryBlock =
    input.glossary.length > 0
      ? `\n\nPROJECT GLOSSARY — you MUST use these exact renderings:\n` +
        input.glossary.map((t) => `- "${t.term_en}" <-> "${t.term_ar}"`).join("\n")
      : "";

  const system = `${HOUSE_STYLE}

TASK: Translate one chat message between two people working on a freelance
project together.

- Translate into ${targetLang === "ar" ? "Arabic" : "English"}.
- Keep the register conversational and professional, matching the original.
- Preserve any code, file names, URLs, numbers and dates exactly.
- Do not answer the message, do not add commentary, do not add a greeting that
  was not there. Return the translation and nothing else.${glossaryBlock}`;

  const result = await complete({
    system,
    user: input.text,
    mockKey: "translate",
    temperature: 0.2,
    maxTokens: 900,
  });

  return {
    translated: result.text.trim(),
    sourceLang,
    targetLang,
    provider: result.provider,
    degradedReason: result.degradedReason,
  };
}
