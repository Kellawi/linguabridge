"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dirFor, type Lang } from "@/lib/language";
import { t as translate, type DictKey } from "@/lib/i18n";

/**
 * Interface language state, with the dynamic RTL/LTR direction switching
 * required by thesis §4.4 ("supporting RTL (Arabic) and LTR (English) layouts
 * with dynamic direction switching").
 *
 * The choice is written to <html lang> and <html dir> so that the browser's
 * own bidirectional algorithm, text selection, and scrollbar placement all
 * follow — CSS logical properties alone would not fix those.
 */

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: DictKey) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "lb_lang";

export function LanguageProvider({
  children,
  initialLang = "ar",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Restore the visitor's previous choice. Runs after hydration so that server
  // and client render the same markup on first paint.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === "ar" ? "en" : "ar"),
      t: (key: DictKey) => translate(key, lang),
      dir: dirFor(lang),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLang must be used inside a <LanguageProvider>.");
  }
  return context;
}
