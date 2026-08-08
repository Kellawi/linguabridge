"use client";

import Link from "next/link";
import { dirFor } from "@/lib/language";
import type { JobView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";
import { JobList } from "@/components/JobList";

export interface DashboardProposal {
  id: string;
  jobId: string;
  jobTitleAr: string;
  jobTitleEn: string;
  status: "draft" | "submitted" | "accepted" | "declined";
}

export function Dashboard({
  fullName,
  role,
  jobs,
  proposals,
  profileComplete,
}: {
  fullName: string;
  role: "employer" | "freelancer";
  jobs: JobView[];
  proposals: DashboardProposal[];
  profileComplete: boolean;
}) {
  const { t, lang } = useLang();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {t("welcome")}, {fullName}
        </h1>
        {role === "employer" ? (
          <Link href="/jobs/new" className="lb-btn lb-btn-primary">
            {t("nav_postJob")}
          </Link>
        ) : (
          <Link href="/jobs" className="lb-btn lb-btn-primary">
            {t("nav_jobs")}
          </Link>
        )}
      </header>

      {role === "freelancer" && !profileComplete && (
        <div
          className="lb-card flex flex-wrap items-center justify-between gap-3 p-5"
          style={{ borderColor: "var(--accent)" }}
        >
          <p className="text-sm">{t("profileIncomplete")}</p>
          <Link href="/profile" className="lb-btn lb-btn-secondary !py-1.5 !text-sm">
            {t("completeProfile")}
          </Link>
        </div>
      )}

      {role === "employer" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("yourJobs")}</h2>
          <JobList jobs={jobs} />
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-bold">{t("yourProposals")}</h2>
            {proposals.length === 0 ? (
              <p className="lb-card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                —
              </p>
            ) : (
              <ul className="space-y-2">
                {proposals.map((proposal) => (
                  <li key={proposal.id}>
                    <Link
                      href={`/jobs/${proposal.jobId}`}
                      className="lb-card flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-[var(--brand)]"
                    >
                      <span className="font-medium" dir={dirFor(lang)}>
                        {(lang === "ar" ? proposal.jobTitleAr : proposal.jobTitleEn) ||
                          proposal.jobTitleEn}
                      </span>
                      <span
                        className="lb-chip"
                        style={
                          proposal.status === "accepted" ? { color: "var(--success)" } : undefined
                        }
                      >
                        {proposal.status === "accepted" ? t("proposalAccepted") : proposal.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">{t("jobsTitle")}</h2>
            <JobList jobs={jobs} />
          </section>
        </>
      )}
    </div>
  );
}
