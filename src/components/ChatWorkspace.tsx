"use client";

import { useEffect, useRef, useState } from "react";
import { dirFor, type Lang } from "@/lib/language";
import type { ConversationView, GlossaryView, MessageView } from "@/lib/view-types";
import { useLang } from "@/components/LanguageProvider";

/**
 * §4.3.5 Real-Time Chat Translation with a shared project glossary.
 *
 * Ranked #2 in thesis Table 4.2 (21.8%). "Both parties communicate in their
 * preferred language, and the system translates incoming messages and presents
 * them alongside the original."
 *
 * The bubble below shows the reader's language first and keeps the original
 * text visible underneath rather than replacing it. That ordering matters: a
 * negotiation conducted through a translation layer needs both parties to be
 * able to check what was actually written when something reads oddly.
 */

const POLL_INTERVAL_MS = 8000;

export function ChatWorkspace({
  conversation,
  initialMessages,
  initialGlossary,
  currentUserId,
}: {
  conversation: ConversationView;
  initialMessages: MessageView[];
  initialGlossary: GlossaryView[];
  currentUserId: string;
}) {
  const { t, lang } = useLang();

  const [messages, setMessages] = useState(initialMessages);
  const [glossary, setGlossary] = useState(initialGlossary);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [termEn, setTermEn] = useState("");
  const [termAr, setTermAr] = useState("");
  const [addingTerm, setAddingTerm] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // Poll for the counterpart's messages. Thesis §4.4 specifies Redis for
  // real-time chat state; polling is the deployable stand-in for this
  // prototype, and is swappable for a websocket without touching the UI.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/${conversation.id}/messages`);
        if (!response.ok) return;
        const data = await response.json();
        setMessages((current) =>
          data.messages.length === current.length
            ? current
            : data.messages.map((m: Record<string, unknown>) => ({
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_name ?? "",
                body: m.body,
                sourceLang: m.source_lang,
                translated: m.translated,
                targetLang: m.target_lang,
                aiProvider: m.ai_provider,
                createdAt: new Date(m.created_at as string).toISOString(),
              })),
        );
      } catch {
        // Transient network failures are expected; the next tick retries.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [conversation.id]);

  async function send() {
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not send.");
        return;
      }

      const m = data.message;
      setMessages((current) => [
        ...current,
        {
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          body: m.body,
          sourceLang: m.source_lang,
          translated: m.translated,
          targetLang: m.target_lang,
          aiProvider: m.ai_provider,
          createdAt: new Date(m.created_at).toISOString(),
        },
      ]);
      setDraft("");
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setSending(false);
    }
  }

  async function addTerm(event: React.FormEvent) {
    event.preventDefault();
    if (!termEn.trim() || !termAr.trim()) return;

    setAddingTerm(true);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/glossary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termEn, termAr }),
      });
      const data = await response.json();
      if (response.ok) {
        setGlossary(
          data.glossary.map((g: { id: string; term_en: string; term_ar: string }) => ({
            id: g.id,
            termEn: g.term_en,
            termAr: g.term_ar,
          })),
        );
        setTermEn("");
        setTermAr("");
      }
    } finally {
      setAddingTerm(false);
    }
  }

  const jobTitle = (lang === "ar" ? conversation.jobTitleAr : conversation.jobTitleEn) ||
    conversation.jobTitleEn;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="lb-card flex h-[70vh] flex-col">
        <header className="border-b px-5 py-3">
          <h1 className="font-semibold" dir={dirFor(lang)}>
            {jobTitle}
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {conversation.counterpartName}
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              readerLang={lang}
              isMine={message.senderId === currentUserId}
              originalLabel={t("original")}
            />
          ))}
        </div>

        <footer className="border-t p-3">
          {error && (
            <p className="mb-2 text-sm" style={{ color: "var(--danger)" }} role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              rows={2}
              className="lb-input flex-1 resize-none"
              placeholder={t("messagePlaceholder")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || draft.trim().length === 0}
              className="lb-btn lb-btn-primary self-end"
            >
              {sending ? "…" : t("send")}
            </button>
          </div>
        </footer>
      </section>

      {/* ---- Shared project glossary ---- */}
      <aside className="lb-card h-fit p-5">
        <h2 className="font-semibold">{t("glossary")}</h2>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t("glossaryIntro")}
        </p>

        <ul className="mt-4 space-y-2">
          {glossary.map((term) => (
            <li
              key={term.id}
              className="rounded-lg p-2.5 text-sm"
              style={{ background: "var(--surface-sunken)" }}
            >
              <span dir="ltr" lang="en">
                {term.termEn}
              </span>
              <span style={{ color: "var(--text-muted)" }}> ⇄ </span>
              <span dir="rtl" lang="ar">
                {term.termAr}
              </span>
            </li>
          ))}
          {glossary.length === 0 && (
            <li className="text-sm" style={{ color: "var(--text-muted)" }}>
              —
            </li>
          )}
        </ul>

        <form onSubmit={addTerm} className="mt-4 space-y-2">
          <input
            className="lb-input !py-2 !text-sm"
            dir="ltr"
            lang="en"
            placeholder={t("termEn")}
            value={termEn}
            onChange={(e) => setTermEn(e.target.value)}
            aria-label={t("termEn")}
          />
          <input
            className="lb-input !py-2 !text-sm"
            dir="rtl"
            lang="ar"
            placeholder={t("termAr")}
            value={termAr}
            onChange={(e) => setTermAr(e.target.value)}
            aria-label={t("termAr")}
          />
          <button
            type="submit"
            disabled={addingTerm || !termEn.trim() || !termAr.trim()}
            className="lb-btn lb-btn-secondary w-full !py-2 !text-sm"
          >
            {addingTerm ? t("working") : t("addTerm")}
          </button>
        </form>
      </aside>
    </div>
  );
}

function MessageBubble({
  message,
  readerLang,
  isMine,
  originalLabel,
}: {
  message: MessageView;
  readerLang: Lang;
  isMine: boolean;
  originalLabel: string;
}) {
  // If the sender wrote in the reader's language, no translation is needed and
  // the original stands alone. Otherwise lead with the translation and keep
  // the original beneath it.
  const needsTranslation = message.sourceLang !== readerLang && Boolean(message.translated);
  const primary = needsTranslation ? message.translated! : message.body;
  const primaryLang = needsTranslation ? (message.targetLang ?? readerLang) : message.sourceLang;

  return (
    <div className={isMine ? "flex justify-end" : "flex justify-start"}>
      <div
        className="max-w-[85%] rounded-xl px-4 py-3"
        style={{
          background: isMine ? "var(--brand-soft)" : "var(--surface-sunken)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="mb-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          {message.senderName}
        </div>

        <div
          lang={primaryLang}
          dir={dirFor(primaryLang)}
          className="whitespace-pre-wrap text-sm leading-relaxed"
        >
          {primary}
        </div>

        {needsTranslation && (
          <div
            className="mt-2 border-t pt-2 text-xs"
            lang={message.sourceLang}
            dir={dirFor(message.sourceLang)}
          >
            <span className="font-semibold" style={{ color: "var(--brand)" }}>
              {originalLabel}:{" "}
            </span>
            <span className="whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
              {message.body}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
