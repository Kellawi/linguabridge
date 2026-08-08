"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";

/**
 * Public landing page. The four feature cards correspond exactly to the MVP
 * features implemented in this build, with their thesis Table 4.2 ranking.
 */

const FEATURES = [
  {
    icon: "◈",
    rank: "§4.3.1",
    ar: { title: "ملف شخصي ثنائي اللغة", body: "اكتب عن نفسك بالعربية، واحصل على نسخة إنجليزية احترافية مع استخراج تلقائي لمهاراتك وتوحيد صيغة سعرك." },
    en: { title: "Bilingual profile", body: "Write about yourself in Arabic and get a professional English version, with automatic skill extraction and rate normalisation." },
  },
  {
    icon: "◆",
    rank: "§4.3.2 · 27.3%",
    ar: { title: "وصف مشروع ثنائي اللغة", body: "يحوّل وصف المشروع إلى مواصفة منظّمة بالعربية والإنجليزية، وينبّه صاحب العمل إلى ما ينقصه قبل النشر." },
    en: { title: "Bilingual job briefs", body: "Turns a free-text description into a structured brief in both languages, and prompts the employer for what is missing before publishing." },
  },
  {
    icon: "◉",
    rank: "§4.3.4",
    ar: { title: "كتابة العروض بإرشاد", body: "أجب عن خمسة أسئلة بلغتك، ويتولّى النظام صياغة عرض إنجليزي احترافي تراجعه وتعدّله قبل الإرسال." },
    en: { title: "Guided proposals", body: "Answer five questions in your own language; the system assembles a professional English proposal for you to review and edit." },
  },
  {
    icon: "◐",
    rank: "§4.3.5 · 21.8%",
    ar: { title: "ترجمة المحادثات مع مسرد", body: "يكتب كل طرف بلغته، وتُعرض الترجمة إلى جانب النص الأصلي، مع مسرد مشترك يحافظ على ثبات المصطلحات." },
    en: { title: "Chat translation + glossary", body: "Each party writes in their own language; the translation appears beside the original, with a shared glossary keeping terminology consistent." },
  },
] as const;

const EVIDENCE = [
  { value: "74.5%", ar: "لم يستخدموا منصّة عمل حر رسمية قط", en: "had never used a formal freelancing platform" },
  { value: "40.0%", ar: "ذكروا حاجزاً لغوياً كعائقهم الأساسي", en: "named a language-linked barrier as their main obstacle" },
  { value: "2.29/5", ar: "ثقتهم بكتابة عرض بالإنجليزية — أدنى بند في الاستبيان", en: "confidence writing an English proposal — the lowest item in the survey" },
  { value: "4.11/5", ar: "احتمال استخدامهم لينجوا بريدج", en: "likelihood of using LinguaBridge" },
] as const;

export function Landing() {
  const { lang, t } = useLang();

  return (
    <div className="space-y-16">
      <section className="py-8 text-center sm:py-14">
        <span className="lb-chip">{t("tagline")}</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
          {t("heroTitle")}
        </h1>
        <p
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {t("heroBody")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="lb-btn lb-btn-primary">
            {t("heroCta")}
          </Link>
          <Link href="/jobs" className="lb-btn lb-btn-secondary">
            {t("heroSecondary")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <article key={feature.rank} className="lb-card p-6">
            <div className="flex items-start gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                aria-hidden
              >
                {feature.icon}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{feature[lang].title}</h2>
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {feature.rank}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {feature[lang].body}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="lb-card p-6 sm:p-8">
        <h2 className="text-lg font-bold">
          {lang === "ar" ? "الأساس البحثي" : "The evidence behind this"}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {lang === "ar"
            ? "من استبيان شمل ٥٥ مشاركاً في عمّان والزرقاء وإربد، شباط ٢٠٢٦."
            : "From a 55-respondent survey across Amman, Zarqa and Irbid, February 2026."}
        </p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EVIDENCE.map((item) => (
            <div key={item.value}>
              <dt className="text-2xl font-bold" style={{ color: "var(--brand)" }}>
                {item.value}
              </dt>
              <dd className="mt-1 text-sm leading-snug" style={{ color: "var(--text-muted)" }}>
                {item[lang]}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
