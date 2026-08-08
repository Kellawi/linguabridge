/**
 * Language utilities shared by client and server.
 *
 * Thesis design principle 1 (§4.1): "language inclusivity, in which Arabic and
 * English are treated as equal first-class languages throughout". Nothing here
 * treats English as the default or canonical form.
 */

export type Lang = "ar" | "en";

export const LANGS: readonly Lang[] = ["ar", "en"] as const;

export const LANG_LABEL: Record<Lang, string> = {
  ar: "العربية",
  en: "English",
};

export const LANG_ENGLISH_NAME: Record<Lang, string> = {
  ar: "Arabic",
  en: "English",
};

export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function otherLang(lang: Lang): Lang {
  return lang === "ar" ? "en" : "ar";
}

/** Unicode blocks covering Arabic script, including supplements and presentation forms. */
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * Detects whether text is predominantly Arabic. Uses a ratio rather than a
 * single-character test so that an Arabic sentence containing a Latin
 * technical term ("React", "API") is still classified as Arabic.
 */
export function detectLang(text: string): Lang {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (letters.length === 0) return "en";

  let arabic = 0;
  for (const ch of letters) {
    if (ARABIC_RE.test(ch)) arabic += 1;
  }
  return arabic / letters.length >= 0.3 ? "ar" : "en";
}

/**
 * A piece of user content held in both languages, with a record of which side
 * the human actually wrote. The platform never discards the original: thesis
 * §4.3.1 requires the Arabic original be presented alongside the English.
 */
export interface Bilingual {
  ar: string;
  en: string;
  /** The language the human authored. The other side is AI-assisted. */
  source: Lang;
}

export function pick(value: Bilingual | null | undefined, lang: Lang): string {
  if (!value) return "";
  return value[lang] || value[otherLang(lang)] || "";
}
