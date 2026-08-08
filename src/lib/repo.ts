import "server-only";

import { sql } from "@/lib/db";
import { ForbiddenError } from "@/lib/auth";
import type { Lang } from "@/lib/language";
import type {
  ConversationView,
  GlossaryView,
  JobView,
  MessageView,
  ProfileView,
  ProposalView,
} from "@/lib/view-types";

/**
 * Data access layer. Server components and route handlers both read through
 * these functions so that access rules (particularly conversation membership)
 * live in one place rather than being re-implemented per call site.
 */

export interface JobRow {
  id: string;
  employer_id: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  deliverables_ar: string[];
  deliverables_en: string[];
  skills: string[];
  budget_amount: string | null;
  budget_currency: string | null;
  deadline: string | null;
  source_lang: Lang;
  status: "draft" | "open" | "closed";
  completeness: number;
  ai_provider: string | null;
  created_at: Date;
  employer_name?: string;
  employer_company?: string | null;
  proposal_count?: number;
}

export interface ProfileRow {
  user_id: string;
  headline_ar: string;
  headline_en: string;
  bio_ar: string;
  bio_en: string;
  skills: string[];
  rate_amount: string | null;
  rate_currency: string | null;
  rate_unit: "hour" | "project" | "day" | null;
  source_lang: Lang;
  published: boolean;
  ai_provider: string | null;
  full_name?: string;
  city?: string | null;
}

export interface ProposalRow {
  id: string;
  job_id: string;
  freelancer_id: string;
  answers: Record<string, string>;
  body_en: string;
  body_ar: string;
  status: "draft" | "submitted" | "accepted" | "declined";
  created_at: Date;
  freelancer_name?: string;
  freelancer_city?: string | null;
  job_title_en?: string;
  job_title_ar?: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  source_lang: Lang;
  translated: string | null;
  target_lang: Lang | null;
  ai_provider: string | null;
  created_at: Date;
  sender_name?: string;
}

export interface ConversationRow {
  id: string;
  job_id: string;
  employer_id: string;
  freelancer_id: string;
  created_at: Date;
  job_title_en?: string;
  job_title_ar?: string;
  counterpart_name?: string;
  last_message_at?: Date | null;
}

export interface GlossaryRow {
  id: string;
  term_en: string;
  term_ar: string;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function listOpenJobs(): Promise<JobRow[]> {
  return sql<JobRow[]>`
    SELECT j.*, u.full_name AS employer_name, u.company AS employer_company,
           (SELECT count(*)::int FROM proposals p WHERE p.job_id = j.id) AS proposal_count
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    WHERE j.status = 'open'
    ORDER BY j.created_at DESC
  `;
}

export async function listEmployerJobs(employerId: string): Promise<JobRow[]> {
  return sql<JobRow[]>`
    SELECT j.*, u.full_name AS employer_name, u.company AS employer_company,
           (SELECT count(*)::int FROM proposals p WHERE p.job_id = j.id) AS proposal_count
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    WHERE j.employer_id = ${employerId}
    ORDER BY j.created_at DESC
  `;
}

export async function getJob(jobId: string): Promise<JobRow | null> {
  const rows = await sql<JobRow[]>`
    SELECT j.*, u.full_name AS employer_name, u.company AS employer_company,
           (SELECT count(*)::int FROM proposals p WHERE p.job_id = j.id) AS proposal_count
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    WHERE j.id = ${jobId}
  `;
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const rows = await sql<ProfileRow[]>`
    SELECT f.*, u.full_name, u.city
    FROM freelancer_profiles f
    JOIN users u ON u.id = f.user_id
    WHERE f.user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function listPublishedProfiles(): Promise<ProfileRow[]> {
  return sql<ProfileRow[]>`
    SELECT f.*, u.full_name, u.city
    FROM freelancer_profiles f
    JOIN users u ON u.id = f.user_id
    WHERE f.published = true
    ORDER BY f.updated_at DESC
  `;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export async function listProposalsForJob(jobId: string): Promise<ProposalRow[]> {
  return sql<ProposalRow[]>`
    SELECT p.*, u.full_name AS freelancer_name, u.city AS freelancer_city
    FROM proposals p
    JOIN users u ON u.id = p.freelancer_id
    WHERE p.job_id = ${jobId}
    ORDER BY p.created_at DESC
  `;
}

export async function listProposalsForFreelancer(freelancerId: string): Promise<ProposalRow[]> {
  return sql<ProposalRow[]>`
    SELECT p.*, j.title_en AS job_title_en, j.title_ar AS job_title_ar
    FROM proposals p
    JOIN jobs j ON j.id = p.job_id
    WHERE p.freelancer_id = ${freelancerId}
    ORDER BY p.created_at DESC
  `;
}

export async function getProposalFor(
  jobId: string,
  freelancerId: string,
): Promise<ProposalRow | null> {
  const rows = await sql<ProposalRow[]>`
    SELECT * FROM proposals WHERE job_id = ${jobId} AND freelancer_id = ${freelancerId}
  `;
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Conversations — membership is enforced here, not at the call site
// ---------------------------------------------------------------------------

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  return sql<ConversationRow[]>`
    SELECT c.*,
           j.title_en AS job_title_en,
           j.title_ar AS job_title_ar,
           other.full_name AS counterpart_name,
           (SELECT max(m.created_at) FROM messages m WHERE m.conversation_id = c.id)
             AS last_message_at
    FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    JOIN users other
      ON other.id = CASE WHEN c.employer_id = ${userId} THEN c.freelancer_id
                         ELSE c.employer_id END
    WHERE c.employer_id = ${userId} OR c.freelancer_id = ${userId}
    ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
  `;
}

/**
 * Loads a conversation only if the requesting user is one of its two members.
 * Throws `ForbiddenError` otherwise — a missing row and a row belonging to
 * someone else are treated identically so the endpoint cannot be used to probe
 * for the existence of other people's conversations.
 */
export async function getConversationForMember(
  conversationId: string,
  userId: string,
): Promise<ConversationRow> {
  const rows = await sql<ConversationRow[]>`
    SELECT c.*, j.title_en AS job_title_en, j.title_ar AS job_title_ar,
           other.full_name AS counterpart_name
    FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    JOIN users other
      ON other.id = CASE WHEN c.employer_id = ${userId} THEN c.freelancer_id
                         ELSE c.employer_id END
    WHERE c.id = ${conversationId}
      AND (c.employer_id = ${userId} OR c.freelancer_id = ${userId})
  `;

  const conversation = rows[0];
  if (!conversation) throw new ForbiddenError("Conversation not found.");
  return conversation;
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  return sql<MessageRow[]>`
    SELECT m.*, u.full_name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `;
}

export async function listGlossary(conversationId: string): Promise<GlossaryRow[]> {
  return sql<GlossaryRow[]>`
    SELECT id, term_en, term_ar
    FROM glossary_terms
    WHERE conversation_id = ${conversationId}
    ORDER BY term_en ASC
  `;
}

// ---------------------------------------------------------------------------
// Row -> view mappers
//
// Postgres returns NUMERIC as a string (to avoid float precision loss) and
// TIMESTAMPTZ as a Date. Neither survives the server/client component boundary
// in a useful form, so every row is normalised here before it reaches the UI.
// ---------------------------------------------------------------------------

function num(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toJobView(row: JobRow): JobView {
  return {
    id: row.id,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    summaryAr: row.summary_ar,
    summaryEn: row.summary_en,
    deliverablesAr: Array.isArray(row.deliverables_ar) ? row.deliverables_ar : [],
    deliverablesEn: Array.isArray(row.deliverables_en) ? row.deliverables_en : [],
    skills: row.skills ?? [],
    budgetAmount: num(row.budget_amount),
    budgetCurrency: row.budget_currency,
    deadline: row.deadline,
    sourceLang: row.source_lang,
    completeness: row.completeness,
    aiProvider: row.ai_provider,
    createdAt: row.created_at.toISOString(),
    employerName: row.employer_name ?? "",
    employerCompany: row.employer_company ?? null,
    proposalCount: row.proposal_count ?? 0,
  };
}

export function toProfileView(row: ProfileRow): ProfileView {
  return {
    userId: row.user_id,
    fullName: row.full_name ?? "",
    city: row.city ?? null,
    headlineAr: row.headline_ar,
    headlineEn: row.headline_en,
    bioAr: row.bio_ar,
    bioEn: row.bio_en,
    skills: row.skills ?? [],
    rateAmount: num(row.rate_amount),
    rateCurrency: row.rate_currency,
    rateUnit: row.rate_unit,
    sourceLang: row.source_lang,
  };
}

export function toProposalView(row: ProposalRow): ProposalView {
  return {
    id: row.id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name ?? "",
    freelancerCity: row.freelancer_city ?? null,
    bodyEn: row.body_en,
    bodyAr: row.body_ar,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export function toMessageView(row: MessageRow): MessageView {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? "",
    body: row.body,
    sourceLang: row.source_lang,
    translated: row.translated,
    targetLang: row.target_lang,
    aiProvider: row.ai_provider,
    createdAt: row.created_at.toISOString(),
  };
}

export function toGlossaryView(row: GlossaryRow): GlossaryView {
  return { id: row.id, termEn: row.term_en, termAr: row.term_ar };
}

export function toConversationView(row: ConversationRow): ConversationView {
  return {
    id: row.id,
    jobTitleAr: row.job_title_ar ?? "",
    jobTitleEn: row.job_title_en ?? "",
    counterpartName: row.counterpart_name ?? "",
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null,
  };
}
