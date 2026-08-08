"use client";

import { useLang } from "@/components/LanguageProvider";

export function JobsPageHeader() {
  const { t } = useLang();
  return <h1 className="text-2xl font-bold">{t("jobsTitle")}</h1>;
}
