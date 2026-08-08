"use client";

import Link from "next/link";
import { dirFor, pick } from "@/lib/language";
import type { JobView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";

export function JobList({ jobs, emptyHint }: { jobs: JobView[]; emptyHint?: string }) {
  const { t, lang } = useLang();

  if (jobs.length === 0) {
    return (
      <p className="lb-card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        {emptyHint ?? t("jobsEmpty")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {jobs.map((job) => {
        const title = pick({ ar: job.titleAr, en: job.titleEn, source: job.sourceLang }, lang);
        const summary = pick(
          { ar: job.summaryAr, en: job.summaryEn, source: job.sourceLang },
          lang,
        );

        return (
          <li key={job.id}>
            <Link href={`/jobs/${job.id}`} className="lb-card block p-5 transition-colors hover:border-[var(--brand)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold" dir={dirFor(lang)}>
                  {title}
                </h2>
                {job.budgetAmount !== null && (
                  <span className="lb-chip shrink-0" dir="ltr">
                    {job.budgetCurrency ?? "USD"} {job.budgetAmount.toLocaleString("en-US")}
                  </span>
                )}
              </div>

              <p
                className="mt-2 line-clamp-3 text-sm leading-relaxed"
                style={{ color: "var(--text-muted)" }}
                dir={dirFor(lang)}
              >
                {summary}
              </p>

              {job.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5" dir="ltr">
                  {job.skills.map((skill) => (
                    <span key={skill} className="lb-chip !text-[11px]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div
                className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span>
                  {t("postedBy")}: {job.employerCompany || job.employerName}
                </span>
                {job.deadline && <span>· {job.deadline}</span>}
                <span>
                  · {t("proposalsReceived")}: {job.proposalCount}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
