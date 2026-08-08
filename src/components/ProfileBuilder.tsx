"use client";

import { useState } from "react";
import { dirFor, type Lang } from "@/lib/language";
import { useLang } from "@/components/LanguageProvider";
import { AiBadge } from "@/components/AiBadge";

/**
 * §4.3.1 Bilingual Profile Engine.
 *
 * Three functions per the thesis: translation, skill auto-tagging, and rate
 * normalisation. The generated draft lands in editable fields — the freelancer
 * "retains full editorial control over both versions before publication".
 */

export interface ProfileInitial {
  headlineAr: string;
  headlineEn: string;
  bioAr: string;
  bioEn: string;
  skills: string[];
  rateAmount: number | null;
  rateCurrency: string | null;
  rateUnit: "hour" | "project" | "day" | null;
  sourceLang: Lang;
  published: boolean;
}

export function ProfileBuilder({ initial }: { initial: ProfileInitial }) {
  const { t, lang } = useLang();

  const [rawText, setRawText] = useState("");
  const [statedRate, setStatedRate] = useState("");
  const [profile, setProfile] = useState<ProfileInitial>(initial);
  const [provider, setProvider] = useState<string | null>(null);
  const [degradedReason, setDegradedReason] = useState<string | undefined>();
  const [notes, setNotes] = useState<{ ar: string; en: string } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasDraft = Boolean(profile.headlineEn || profile.headlineAr || profile.bioEn || profile.bioAr);

  async function generate() {
    setGenerating(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/ai/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, statedRate: statedRate || undefined }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }

      const draft = data.draft;
      setProfile({
        headlineAr: draft.headline_ar ?? "",
        headlineEn: draft.headline_en ?? "",
        bioAr: draft.bio_ar ?? "",
        bioEn: draft.bio_en ?? "",
        skills: draft.skills ?? [],
        rateAmount: draft.rate_amount,
        rateCurrency: draft.rate_currency,
        rateUnit: draft.rate_unit,
        sourceLang: profile.sourceLang,
        published: profile.published,
      });
      setNotes({ ar: draft.notes_ar ?? "", en: draft.notes_en ?? "" });
      setProvider(data.provider);
      setDegradedReason(data.degradedReason);
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setGenerating(false);
    }
  }

  async function save(publish: boolean) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, published: publish, aiProvider: provider }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }

      setProfile((p) => ({ ...p, published: publish }));
      setSaved(true);
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ProfileInitial>(key: K, value: ProfileInitial[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t("profileTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("profileIntro")}
        </p>
      </header>

      {/* ---- Step 1: the freelancer writes freely in their own language ---- */}
      <section className="lb-card p-6">
        <label className="lb-label" htmlFor="rawText">
          {t("profileRawLabel")}
        </label>
        <textarea
          id="rawText"
          rows={6}
          className="lb-input"
          placeholder={t("profileRawPlaceholder")}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        <div className="mt-4">
          <label className="lb-label" htmlFor="statedRate">
            {t("profileRateLabel")} <span className="font-normal">({t("optional")})</span>
          </label>
          <input
            id="statedRate"
            className="lb-input"
            placeholder={lang === "ar" ? "١٥ دولار بالساعة" : "$15 per hour"}
            value={statedRate}
            onChange={(e) => setStatedRate(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={generating || rawText.trim().length < 20}
          className="lb-btn lb-btn-primary mt-4"
        >
          {generating ? t("working") : hasDraft ? t("profileRegenerate") : t("profileGenerate")}
        </button>
      </section>

      {error && (
        <p className="lb-card p-4 text-sm" style={{ color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}

      {generating && (
        <div className="lb-card space-y-3 p-6">
          <div className="lb-skeleton h-5 w-1/2" />
          <div className="lb-skeleton h-20 w-full" />
          <div className="lb-skeleton h-5 w-1/3" />
        </div>
      )}

      {/* ---- Step 2: the human edits and approves ---- */}
      {hasDraft && !generating && (
        <section className="lb-card space-y-5 p-6">
          {provider && (
            <div className="lb-ai-mark py-2">
              <AiBadge provider={provider} degradedReason={degradedReason} />
              <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {t("aiDraftNote")}
              </p>
            </div>
          )}

          {notes && (notes.ar || notes.en) && (
            <p
              className="rounded-lg p-3 text-sm"
              style={{ background: "var(--surface-sunken)", color: "var(--text-muted)" }}
              lang={lang}
              dir={dirFor(lang)}
            >
              {notes[lang] || notes.en}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lb-label" htmlFor="headlineAr">
                {t("headline")} — العربية
              </label>
              <input
                id="headlineAr"
                dir="rtl"
                lang="ar"
                className="lb-input"
                value={profile.headlineAr}
                onChange={(e) => update("headlineAr", e.target.value)}
              />
            </div>
            <div>
              <label className="lb-label" htmlFor="headlineEn">
                {t("headline")} — English
              </label>
              <input
                id="headlineEn"
                dir="ltr"
                lang="en"
                className="lb-input"
                value={profile.headlineEn}
                onChange={(e) => update("headlineEn", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lb-label" htmlFor="bioAr">
                {t("bio")} — العربية
              </label>
              <textarea
                id="bioAr"
                rows={8}
                dir="rtl"
                lang="ar"
                className="lb-input"
                value={profile.bioAr}
                onChange={(e) => update("bioAr", e.target.value)}
              />
            </div>
            <div>
              <label className="lb-label" htmlFor="bioEn">
                {t("bio")} — English
              </label>
              <textarea
                id="bioEn"
                rows={8}
                dir="ltr"
                lang="en"
                className="lb-input"
                value={profile.bioEn}
                onChange={(e) => update("bioEn", e.target.value)}
              />
            </div>
          </div>

          {/* Auto-tagged skills, removable one by one. */}
          <div>
            <span className="lb-label">{t("skills")}</span>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="lb-chip" dir="ltr">
                  {skill}
                  <button
                    type="button"
                    onClick={() => update("skills", profile.skills.filter((s) => s !== skill))}
                    aria-label={`Remove ${skill}`}
                    className="ms-1 opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
              {profile.skills.length === 0 && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  —
                </span>
              )}
            </div>
          </div>

          {/* Normalised rate, still editable. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="lb-label" htmlFor="rateAmount">
                {t("rate")}
              </label>
              <input
                id="rateAmount"
                type="number"
                min={0}
                dir="ltr"
                className="lb-input"
                value={profile.rateAmount ?? ""}
                onChange={(e) =>
                  update("rateAmount", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="lb-label" htmlFor="rateCurrency">
                {lang === "ar" ? "العملة" : "Currency"}
              </label>
              <input
                id="rateCurrency"
                dir="ltr"
                className="lb-input"
                value={profile.rateCurrency ?? ""}
                onChange={(e) => update("rateCurrency", e.target.value || null)}
              />
            </div>
            <div>
              <label className="lb-label" htmlFor="rateUnit">
                {lang === "ar" ? "الوحدة" : "Unit"}
              </label>
              <select
                id="rateUnit"
                className="lb-input"
                value={profile.rateUnit ?? ""}
                onChange={(e) =>
                  update("rateUnit", (e.target.value || null) as ProfileInitial["rateUnit"])
                }
              >
                <option value="">—</option>
                <option value="hour">{t("perHour")}</option>
                <option value="day">{t("perDay")}</option>
                <option value="project">{t("perProject")}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="lb-btn lb-btn-primary"
            >
              {saving ? t("working") : t("profilePublish")}
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="lb-btn lb-btn-secondary"
            >
              {t("save")}
            </button>
            {saved && (
              <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                ✓ {t("profileSaved")}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
