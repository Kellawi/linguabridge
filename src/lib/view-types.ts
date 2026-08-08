import type { Lang } from "@/lib/language";

/**
 * Plain, serialisable shapes passed from server components to client
 * components. Database rows carry `Date` objects and `NUMERIC`-as-string
 * values that do not survive the server/client boundary cleanly, so pages map
 * rows into these before rendering.
 */

export interface JobView {
  id: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  deliverablesAr: string[];
  deliverablesEn: string[];
  skills: string[];
  budgetAmount: number | null;
  budgetCurrency: string | null;
  deadline: string | null;
  sourceLang: Lang;
  completeness: number;
  aiProvider: string | null;
  createdAt: string;
  employerName: string;
  employerCompany: string | null;
  proposalCount: number;
}

export interface ProfileView {
  userId: string;
  fullName: string;
  city: string | null;
  headlineAr: string;
  headlineEn: string;
  bioAr: string;
  bioEn: string;
  skills: string[];
  rateAmount: number | null;
  rateCurrency: string | null;
  rateUnit: "hour" | "project" | "day" | null;
  sourceLang: Lang;
}

export interface ProposalView {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerCity: string | null;
  bodyEn: string;
  bodyAr: string;
  status: "draft" | "submitted" | "accepted" | "declined";
  createdAt: string;
}

export interface MessageView {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  sourceLang: Lang;
  translated: string | null;
  targetLang: Lang | null;
  aiProvider: string | null;
  createdAt: string;
}

export interface GlossaryView {
  id: string;
  termEn: string;
  termAr: string;
}

export interface ConversationView {
  id: string;
  jobTitleAr: string;
  jobTitleEn: string;
  counterpartName: string;
  lastMessageAt: string | null;
}
