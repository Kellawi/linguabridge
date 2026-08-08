"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dirFor, type Lang } from "@/lib/language";
import { useLang } from "@/components/LanguageProvider";
import { AiBadge } from "@/components/AiBadge";

/**
 * §4.3.2 Bilingual Job Brief Generator + constraint-completeness checker.
 *
 * Ranked #1 in thesis Table 4.2 — 27.3% of respondents named auto-translation
 * of job briefs their single most valuable feature.
 */

interface Draft {
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  deliverablesAr: string[];
  deliverablesEn: string[];
  skills: string[];
  sourceLang: Lang;
}

interface MissingItem {
  field: string;
  question_en: string;
  question_ar: string;
}

const EMPTY: Draft = {
  titleAr: "",
  titleEn: "",
  summaryAr: "",
  summaryEn: "",
  deliverablesAr: [],
  deliverablesEn: [],
  skills: [],
  sourceLang: "ar",
};

export function JobBriefComposer() {
  const { t, lang } = useLang();
  const router = useRouter();

  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");

  const [provider, setProvider] = useState<string | null>(null);
  const [degradedReason, setDegradedReason] = useState<string | undefined>();
  const [completeness, setCompleteness] = useState<number | null>(null);
  const [missing, setMissing] = useState<MissingItem[]>([]);

  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDraft = Boolean(draft.titleEn || draft.titleAr || draft.summaryEn || draft.summaryAr);

  async function generate() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/job-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }

      const d = data.draft;
      setDraft({
        titleAr: d.title_ar ?? "",
        titleEn: d.title_en ?? "",
        summaryAr: d.summary_ar ?? "",
        summaryEn: d.summary_en ?? "",
        deliverablesAr: d.deliverables_ar ?? [],
        deliverablesEn: d.deliverables_en ?? [],
        skills: d.skills ?? [],
        sourceLang: d.source_lang ?? "ar",
      });
      setProvider(data.provider);
      setDegradedReason(data.degradedReason);

      // Run the completeness check immediately — its whole purpose is to catch
      // gaps before publication, so it should not wait for a second click.
      void runCheck(d.title_en ?? "", d.summary_en || rawText);
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setGenerating(false);
    }
  }

  async function runCheck(title: string, body: string) {
    setChecking(true);
    try {
      const response = await fetch("/api/ai/brief-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          budget: budget || null,
          deadline: deadline || null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setCompleteness(data.check.completeness);
        setMissing(data.check.missing ?? []);
      }
    } catch {
      // A failed completeness check must not block publishing.
    } finally {
      setChecking(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);

    try {
      const parsedBudget = Number.parseFloat(budget.replace(/[^0-9.]/g, ""));

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          budgetAmount: Number.isFinite(parsedBudget) ? parsedBudget : null,
          budgetCurrency: "USD",
          deadline: deadline || null,
          completeness: completeness ?? 0,
          status: "open",
          aiProvider: provider,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Publishing failed.");
        return;
      }

      router.push(`/jobs/${data.id}`);
      router.refresh();
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setPublishing(false);
    }
  }

  function updateDeliverable(index: number, which: "ar" | "en", value: string) {
    setDraft((d) => {
      const key = which === "ar" ? "deliverablesAr" : "deliverablesEn";
      const next = [...d[key]];
      next[index] = value;
      return { ...d, [key]: next };
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t("postJobTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("postJobIntro")}
        </p>
      </header>

      <section className="lb-card p-6">
        <label className="lb-label" htmlFor="rawJob">
          {t("postJobRawLabel")}
        </label>
        <textarea
          id="rawJob"
          rows={6}
          className="lb-input"
          placeholder={t("postJobRawPlaceholder")}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="lb-label" htmlFor="budget">
              {t("budget")} (USD)
            </label>
            <input
              id="budget"
              dir="ltr"
              className="lb-input"
              placeholder="1800"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div>
            <label className="lb-label" htmlFor="deadline">
              {t("deadline")}
            </label>
            <input
              id="deadline"
              className="lb-input"
              placeholder={lang === "ar" ? "ستة أسابيع" : "6 weeks"}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={generating || rawText.trim().length < 20}
          className="lb-btn lb-btn-primary mt-4"
        >
          {generating ? t("working") : t("generateBrief")}
        </button>
      </section>

      {error && (
        <p className="lb-card p-4 text-sm" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      {generating && (
        <div className="lb-card space-y-3 p-6">
          <div className="lb-skeleton h-5 w-2/3" />
          <div className="lb-skeleton h-24 w-full" />
        </div>
      )}

      {hasDraft && !generating && (
        <>
          {/* ---- Constraint-completeness checker ---- */}
          <section className="lb-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{t("completeness")}</h2>
              <button
                type="button"
                onClick={() => runCheck(draft.titleEn, draft.summaryEn)}
                disabled={checking}
                className="lb-btn lb-btn-secondary !px-3 !py-1.5 !text-sm"
              >
                {checking ? t("working") : t("checkBrief")}
              </button>
            </div>

            {completeness !== null && (
              <>
                <div
                  className="mt-4 h-2 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--surface-sunken)" }}
                  role="progressbar"
                  aria-valuenow={completeness}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${completeness}%`,
                      background: completeness >= 75 ? "var(--success)" : "var(--accent)",
                    }}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold">{completeness}%</p>
              </>
            )}

            {missing.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  {t("missingInfo")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {missing.map((item) => (
                    <li
                      key={item.field}
                      className="rounded-lg p-3 text-sm"
                      style={{ background: "var(--surface-sunken)" }}
                      lang={lang}
                      dir={dirFor(lang)}
                    >
                      {lang === "ar" ? item.question_ar : item.question_en}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ---- Editable bilingual draft ---- */}
          <section className="lb-card space-y-5 p-6">
            {provider && (
              <div className="lb-ai-mark py-2">
                <AiBadge provider={provider} degradedReason={degradedReason} />
                <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("aiDraftNote")}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="lb-label" htmlFor="titleAr">
                  {lang === "ar" ? "العنوان" : "Title"} — العربية
                </label>
                <input
                  id="titleAr"
                  dir="rtl"
                  lang="ar"
                  className="lb-input"
                  value={draft.titleAr}
                  onChange={(e) => setDraft((d) => ({ ...d, titleAr: e.target.value }))}
                />
              </div>
              <div>
                <label className="lb-label" htmlFor="titleEn">
                  {lang === "ar" ? "العنوان" : "Title"} — English
                </label>
                <input
                  id="titleEn"
                  dir="ltr"
                  lang="en"
                  className="lb-input"
                  value={draft.titleEn}
                  onChange={(e) => setDraft((d) => ({ ...d, titleEn: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="lb-label" htmlFor="summaryAr">
                  {lang === "ar" ? "الوصف" : "Summary"} — العربية
                </label>
                <textarea
                  id="summaryAr"
                  rows={9}
                  dir="rtl"
                  lang="ar"
                  className="lb-input"
                  value={draft.summaryAr}
                  onChange={(e) => setDraft((d) => ({ ...d, summaryAr: e.target.value }))}
                />
              </div>
              <div>
                <label className="lb-label" htmlFor="summaryEn">
                  {lang === "ar" ? "الوصف" : "Summary"} — English
                </label>
                <textarea
                  id="summaryEn"
                  rows={9}
                  dir="ltr"
                  lang="en"
                  className="lb-input"
                  value={draft.summaryEn}
                  onChange={(e) => setDraft((d) => ({ ...d, summaryEn: e.target.value }))}
                />
              </div>
            </div>

            {draft.deliverablesEn.length > 0 && (
              <div>
                <span className="lb-label">{t("deliverables")}</span>
                <ul className="space-y-2">
                  {draft.deliverablesEn.map((_, index) => (
                    <li key={index} className="grid gap-2 sm:grid-cols-2">
                      <input
                        dir="rtl"
                        lang="ar"
                        className="lb-input !text-sm"
                        value={draft.deliverablesAr[index] ?? ""}
                        onChange={(e) => updateDeliverable(index, "ar", e.target.value)}
                        aria-label={`Deliverable ${index + 1} (Arabic)`}
                      />
                      <input
                        dir="ltr"
                        lang="en"
                        className="lb-input !text-sm"
                        value={draft.deliverablesEn[index] ?? ""}
                        onChange={(e) => updateDeliverable(index, "en", e.target.value)}
                        aria-label={`Deliverable ${index + 1} (English)`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {draft.skills.length > 0 && (
              <div>
                <span className="lb-label">{t("skills")}</span>
                <div className="flex flex-wrap gap-2">
                  {draft.skills.map((skill) => (
                    <span key={skill} className="lb-chip" dir="ltr">
                      {skill}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, skills: d.skills.filter((s) => s !== skill) }))
                        }
                        aria-label={`Remove ${skill}`}
                        className="ms-1 opacity-60 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="lb-btn lb-btn-primary"
            >
              {publishing ? t("working") : t("publishJob")}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
