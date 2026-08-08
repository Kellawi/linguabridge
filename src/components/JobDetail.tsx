"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dirFor } from "@/lib/language";
import type { JobView, ProposalView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";
import { AiBadge } from "@/components/AiBadge";
import { BilingualBlock } from "@/components/BilingualBlock";
import { ProposalComposer } from "@/components/ProposalComposer";

export function JobDetail({
  job,
  viewerRole,
  isOwner,
  existingProposal,
  proposals,
}: {
  job: JobView;
  viewerRole: "employer" | "freelancer" | null;
  isOwner: boolean;
  existingProposal: ProposalView | null;
  proposals: ProposalView[];
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [accepting, setAccepting] = useState<string | null>(null);

  async function accept(proposalId: string) {
    setAccepting(proposalId);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/accept`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        router.push(`/messages/${data.conversationId}`);
        router.refresh();
      }
    } finally {
      setAccepting(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <article className="lb-card p-6">
        <BilingualBlock
          ar={job.titleAr}
          en={job.titleEn}
          sourceLang={job.sourceLang}
          className="text-2xl font-bold"
        />

        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <span>
            {t("postedBy")}: {job.employerCompany || job.employerName}
          </span>
          {job.budgetAmount !== null && (
            <span dir="ltr">
              · {t("budget")}: {job.budgetCurrency ?? "USD"}{" "}
              {job.budgetAmount.toLocaleString("en-US")}
            </span>
          )}
          {job.deadline && (
            <span>
              · {t("deadline")}: {job.deadline}
            </span>
          )}
        </div>

        {job.aiProvider && (
          <div className="lb-ai-mark mt-4 py-2">
            <AiBadge provider={job.aiProvider} />
          </div>
        )}

        <div className="mt-5">
          <BilingualBlock ar={job.summaryAr} en={job.summaryEn} sourceLang={job.sourceLang} />
        </div>

        {job.deliverablesEn.length > 0 && (
          <section className="mt-6">
            <h2 className="lb-label">{t("deliverables")}</h2>
            <ul className="space-y-1.5" dir={dirFor(lang)}>
              {(lang === "ar" ? job.deliverablesAr : job.deliverablesEn).map((item, index) => (
                <li key={index} className="flex gap-2 text-sm">
                  <span style={{ color: "var(--brand)" }} aria-hidden>
                    ▸
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {job.skills.length > 0 && (
          <section className="mt-6">
            <h2 className="lb-label">{t("skills")}</h2>
            <div className="flex flex-wrap gap-2" dir="ltr">
              {job.skills.map((skill) => (
                <span key={skill} className="lb-chip">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* ---- Freelancer view: apply, or see the proposal already sent ---- */}
      {viewerRole === "freelancer" &&
        (existingProposal ? (
          <section className="lb-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t("alreadyApplied")}</h2>
              {existingProposal.status === "accepted" && (
                <span className="lb-chip" style={{ color: "var(--success)" }}>
                  ✓ {t("proposalAccepted")}
                </span>
              )}
            </div>
            <div className="mt-4">
              <BilingualBlock ar={existingProposal.bodyAr} en={existingProposal.bodyEn} />
            </div>
          </section>
        ) : (
          <ProposalComposer job={job} />
        ))}

      {/* ---- Employer view: proposals received ---- */}
      {isOwner && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">
            {t("proposalsReceived")} ({proposals.length})
          </h2>

          {proposals.length === 0 && (
            <p className="lb-card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
              —
            </p>
          )}

          {proposals.map((proposal) => (
            <article key={proposal.id} className="lb-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{proposal.freelancerName}</h3>
                  {proposal.freelancerCity && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {proposal.freelancerCity}
                    </p>
                  )}
                </div>
                {proposal.status === "accepted" ? (
                  <span className="lb-chip" style={{ color: "var(--success)" }}>
                    ✓ {t("proposalAccepted")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => accept(proposal.id)}
                    disabled={accepting !== null}
                    className="lb-btn lb-btn-primary !px-3 !py-1.5 !text-sm"
                  >
                    {accepting === proposal.id ? t("working") : t("acceptProposal")}
                  </button>
                )}
              </div>

              <div className="mt-4">
                <BilingualBlock ar={proposal.bodyAr} en={proposal.bodyEn} />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
