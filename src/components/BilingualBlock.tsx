"use client";

import { useState } from "react";
import { dirFor, otherLang, type Lang } from "@/lib/language";
import { useLang } from "@/components/LanguageProvider";

/**
 * Renders a piece of content in the reader's language, with the counterpart
 * version one click away.
 *
 * The original is never hidden permanently. Thesis §4.3.1 requires that "the
 * English profile is presented alongside the Arabic original" — the point is
 * that a user can always check what was actually written before an AI touched
 * it, rather than having to trust the translation blindly.
 */

export function BilingualBlock({
  ar,
  en,
  sourceLang,
  className = "",
}: {
  ar: string;
  en: string;
  /** Which side the human authored. The other side is AI-assisted. */
  sourceLang?: Lang;
  className?: string;
}) {
  const { lang, t } = useLang();
  const [showOther, setShowOther] = useState(false);

  const value = { ar, en };
  const primary = value[lang];
  const secondaryLang = otherLang(lang);
  const secondary = value[secondaryLang];

  // Fall back to whichever side has content rather than rendering nothing.
  const primaryText = primary || secondary;
  const primaryLang = primary ? lang : secondaryLang;
  const hasBoth = Boolean(primary && secondary);

  return (
    <div className={className}>
      <div
        lang={primaryLang}
        dir={dirFor(primaryLang)}
        className="whitespace-pre-wrap leading-relaxed"
      >
        {primaryText}
      </div>

      {hasBoth && (
        <>
          <button
            type="button"
            onClick={() => setShowOther((v) => !v)}
            className="lb-btn lb-btn-ghost mt-2 !px-2 !py-1 !text-xs"
          >
            {showOther ? t("hideOriginal") : t("showOriginal")}
            <span aria-hidden>{showOther ? "▴" : "▾"}</span>
          </button>

          {showOther && (
            <div
              lang={secondaryLang}
              dir={dirFor(secondaryLang)}
              className="mt-2 rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed"
              style={{ background: "var(--surface-sunken)", color: "var(--text-muted)" }}
            >
              {sourceLang && (
                <div className="mb-1.5 text-xs font-semibold" style={{ color: "var(--brand)" }}>
                  {sourceLang === secondaryLang ? t("original") : t("translation")}
                </div>
              )}
              {secondary}
            </div>
          )}
        </>
      )}
    </div>
  );
}
