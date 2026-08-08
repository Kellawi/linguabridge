"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANG_LABEL, LANGS } from "@/lib/language";
import type { Lang } from "@/lib/language";
import { useLang } from "@/components/LanguageProvider";

/**
 * Mock sign-up: it creates a real row and a real session, but there is no
 * email verification, password-reset flow, or MFA. A production deployment
 * would need all three before handling genuine users.
 */
export function SignUpForm() {
  const { t, lang } = useLang();
  const router = useRouter();

  const [role, setRole] = useState<"employer" | "freelancer">("freelancer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [preferredLang, setPreferredLang] = useState<Lang>(lang);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          company: role === "employer" ? company : undefined,
          city,
          preferredLang,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Sign-up failed.");
        return;
      }

      router.push(role === "freelancer" ? "/profile" : "/jobs/new");
      router.refresh();
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lb-card mx-auto max-w-lg p-6">
      <h1 className="text-xl font-bold">{t("signUpTitle")}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <fieldset>
          <legend className="lb-label">{t("role")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["freelancer", "employer"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className="rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: role === option ? "var(--brand)" : "var(--border)",
                  background: role === option ? "var(--brand-soft)" : "var(--surface)",
                  color: role === option ? "var(--brand)" : "var(--text-muted)",
                }}
                aria-pressed={role === option}
              >
                {t(option)}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="lb-label" htmlFor="fullName">
            {t("fullName")}
          </label>
          <input
            id="fullName"
            required
            className="lb-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {role === "employer" && (
          <div>
            <label className="lb-label" htmlFor="company">
              {t("company")}
            </label>
            <input
              id="company"
              className="lb-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="lb-label" htmlFor="city">
            {t("city")} <span className="font-normal">({t("optional")})</span>
          </label>
          <input
            id="city"
            className="lb-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div>
          <label className="lb-label" htmlFor="signup-email">
            {t("email")}
          </label>
          <input
            id="signup-email"
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            className="lb-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="lb-label" htmlFor="signup-password">
            {t("password")}
          </label>
          <input
            id="signup-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            minLength={8}
            className="lb-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {lang === "ar" ? "ثمانية أحرف على الأقل." : "At least 8 characters."}
          </p>
        </div>

        <fieldset>
          <legend className="lb-label">{t("preferredLang")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {LANGS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPreferredLang(option)}
                className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
                style={{
                  borderColor: preferredLang === option ? "var(--brand)" : "var(--border)",
                  background: preferredLang === option ? "var(--brand-soft)" : "var(--surface)",
                  color: preferredLang === option ? "var(--brand)" : "var(--text-muted)",
                }}
                aria-pressed={preferredLang === option}
              >
                {LANG_LABEL[option]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="lb-btn lb-btn-primary w-full">
          {busy ? t("loading") : t("signUp")}
        </button>
      </form>

      <p className="mt-5 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("haveAccount")}{" "}
        <Link href="/signin" className="font-semibold" style={{ color: "var(--brand)" }}>
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
