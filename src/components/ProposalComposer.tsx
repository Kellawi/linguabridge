"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JobView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";
import { AiBadge } from "@/components/AiBadge";

/**
 * §4.3.4 Guided Proposal Writing Tool.
 *
 * Targets the lowest self-assessment score in the entire survey: mean
 * confidence writing an English proposal, 2.29/5 (thesis §5.3), with 65.5% of
 * respondents at levels 1-2. The structured Arabic framework replaces a blank
 * English text box — the freelancer answers five questions in the language
 * they think in, and reviews the assembled English before it is sent.
 */

const QUESTIONS = [
  { key: "understanding", label: "q_understanding" },
  { key: "approach", label: "q_approach" },
  { key: "timeline", label: "q_timeline" },
  { key: "pricing", label: "q_pricing" },
  { key: "experience", label: "q_experience" },
] as const;

type AnswerKey = (typeof QUESTIONS)[number]["key"];

export function ProposalComposer({ job }: { job: JobView }) {
  const { t, lang } = useLang();
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<AnswerKey, string>>({
    understanding: "",
    approach: "",
    timeline: "",
    pricing: "",
    experience: "",
  });

  const [proposalEn, setProposalEn] = useState("");
  const [proposalAr, setProposalAr] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [degradedReason, setDegradedReason] = useState<string | undefined>();

  const [building, setBuilding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.key].trim().length > 0);

  async function build() {
    setBuilding(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, answers }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }

      setProposalEn(data.proposalEn ?? "");
      setProposalAr(data.proposalAr ?? "");
      setProvider(data.provider);
      setDegradedReason(data.degradedReason);
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setBuilding(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          answers,
          bodyEn: proposalEn,
          bodyAr: proposalAr,
          aiProvider: provider,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }

      setSubmitted(true);
      router.refresh();
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="lb-card p-6">
        <p className="font-semibold" style={{ color: "var(--success)" }}>
          ✓ {t("proposalSubmitted")}
        </p>
      </section>
    );
  }

  return (
    <section className="lb-card space-y-5 p-6">
      <header>
        <h2 className="text-lg font-bold">{t("applyTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("applyIntro")}
        </p>
      </header>

      <div className="space-y-4">
        {QUESTIONS.map((question) => (
          <div key={question.key}>
            <label className="lb-label" htmlFor={question.key}>
              {t(question.label)}
            </label>
            <textarea
              id={question.key}
              rows={3}
              className="lb-input"
              value={answers[question.key]}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [question.key]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={build}
        disabled={building || !allAnswered}
        className="lb-btn lb-btn-primary"
      >
        {building ? t("working") : t("buildProposal")}
      </button>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      {building && (
        <div className="space-y-2">
          <div className="lb-skeleton h-4 w-full" />
          <div className="lb-skeleton h-4 w-11/12" />
          <div className="lb-skeleton h-4 w-3/4" />
        </div>
      )}

      {proposalEn && !building && (
        <div className="space-y-4">
          <div className="lb-ai-mark py-2">
            <AiBadge provider={provider} degradedReason={degradedReason} />
            <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("aiDraftNote")}
            </p>
          </div>

          <div>
            <label className="lb-label" htmlFor="proposalEn">
              English — {lang === "ar" ? "النسخة التي ستُرسل" : "the version that will be sent"}
            </label>
            <textarea
              id="proposalEn"
              rows={12}
              dir="ltr"
              lang="en"
              className="lb-input"
              value={proposalEn}
              onChange={(e) => setProposalEn(e.target.value)}
            />
          </div>

          {proposalAr && (
            <div>
              <label className="lb-label" htmlFor="proposalAr">
                العربية — {lang === "ar" ? "للتحقق مما يُرسل باسمك" : "so you can verify what is sent"}
              </label>
              <textarea
                id="proposalAr"
                rows={10}
                dir="rtl"
                lang="ar"
                className="lb-input"
                value={proposalAr}
                onChange={(e) => setProposalAr(e.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || proposalEn.trim().length === 0}
            className="lb-btn lb-btn-primary"
          >
            {submitting ? t("working") : t("submitProposal")}
          </button>
        </div>
      )}
    </section>
  );
}
