"use client";

import { useLang } from "@/components/LanguageProvider";

/**
 * Transparency marker for AI-produced content.
 *
 * Thesis design principle 3 (§4.1): "transparency, in which AI-generated
 * content is always flagged as such". Every surface that renders model output
 * renders one of these next to it, including the provider that produced it, so
 * a user can tell live output from mock placeholder text.
 */

const PROVIDER_LABEL: Record<string, string> = {
  openai: "GPT-4o-mini",
  gemini: "Gemini 2.5 Flash",
  mock: "mock",
  seed: "sample data",
};

export function AiBadge({
  provider,
  degradedReason,
}: {
  provider?: string | null;
  degradedReason?: string;
}) {
  const { t, lang } = useLang();
  if (!provider) return null;

  const isMock = provider === "mock";
  const isBackup = provider === "gemini" && Boolean(degradedReason);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className="lb-chip"
        style={{
          background: isMock ? "color-mix(in srgb, var(--accent) 18%, transparent)" : undefined,
          color: isMock ? "var(--accent)" : undefined,
        }}
      >
        <span aria-hidden>◆</span>
        {t("aiGenerated")}
      </span>

      <span style={{ color: "var(--text-muted)" }}>
        {t("poweredBy")}: {PROVIDER_LABEL[provider] ?? provider}
      </span>

      {isMock && (
        <span
          className="w-full leading-relaxed"
          style={{ color: "var(--accent)" }}
          lang={lang}
        >
          {t("aiMockNotice")}
        </span>
      )}

      {isBackup && (
        <span className="w-full" style={{ color: "var(--text-muted)" }} lang={lang}>
          {t("aiBackupNotice")}
        </span>
      )}
    </div>
  );
}
