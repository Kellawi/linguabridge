"use client";

import Link from "next/link";
import { dirFor } from "@/lib/language";
import type { ConversationView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";

export function ConversationList({ conversations }: { conversations: ConversationView[] }) {
  const { t, lang } = useLang();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("messagesTitle")}</h1>

      {conversations.length === 0 ? (
        <p className="lb-card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {t("messagesEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="lb-card block p-4 transition-colors hover:border-[var(--brand)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold" dir={dirFor(lang)}>
                    {(lang === "ar" ? conversation.jobTitleAr : conversation.jobTitleEn) ||
                      conversation.jobTitleEn}
                  </span>
                  {conversation.lastMessageAt && (
                    <time
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                      dateTime={conversation.lastMessageAt}
                    >
                      {new Date(conversation.lastMessageAt).toLocaleDateString(
                        lang === "ar" ? "ar-JO" : "en-GB",
                      )}
                    </time>
                  )}
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {conversation.counterpartName}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
