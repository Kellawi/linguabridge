"use client";

import type { ProfileView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";
import { BilingualBlock } from "@/components/BilingualBlock";

/**
 * Employer-facing directory of published bilingual profiles.
 *
 * This is where §4.3.1's purpose becomes visible: a profile written in Arabic
 * is discoverable by an English-reading employer, with skill tags in canonical
 * Latin-script form and the Arabic original always one click away.
 */
export function TalentList({ profiles }: { profiles: ProfileView[] }) {
  const { t } = useLang();

  const unitLabel = {
    hour: t("perHour"),
    day: t("perDay"),
    project: t("perProject"),
  } as const;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_talent")}</h1>

      {profiles.length === 0 ? (
        <p className="lb-card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          —
        </p>
      ) : (
        <ul className="space-y-3">
          {profiles.map((profile) => (
            <li key={profile.userId} className="lb-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{profile.fullName}</h2>
                  {profile.city && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {profile.city}
                    </p>
                  )}
                </div>
                {profile.rateAmount !== null && (
                  <span className="lb-chip shrink-0" dir="ltr">
                    {profile.rateCurrency ?? "USD"} {profile.rateAmount}
                    {profile.rateUnit ? ` / ${unitLabel[profile.rateUnit]}` : ""}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <BilingualBlock
                  ar={profile.headlineAr}
                  en={profile.headlineEn}
                  sourceLang={profile.sourceLang}
                  className="font-medium"
                />
              </div>

              <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                <BilingualBlock
                  ar={profile.bioAr}
                  en={profile.bioEn}
                  sourceLang={profile.sourceLang}
                />
              </div>

              {profile.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5" dir="ltr">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="lb-chip !text-[11px]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
