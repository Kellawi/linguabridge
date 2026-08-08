"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/LanguageProvider";

/**
 * Mock sign-in.
 *
 * The demo accounts below are seeded fixtures whose credentials are published
 * in the README on purpose — they exist so anyone can explore the platform
 * without registering. They guard nothing. The authentication mechanism itself
 * is real (bcrypt + signed httpOnly session cookie); only the account
 * population is fictional.
 */

const DEMO_ACCOUNTS = [
  {
    email: "employer@linguabridge.demo",
    password: "Employer#2026",
    role: { ar: "صاحب عمل", en: "Employer" },
    name: "Layla Mansour · Nawras Digital",
  },
  {
    email: "omar@linguabridge.demo",
    password: "Freelance#2026",
    role: { ar: "مستقل", en: "Freelancer" },
    name: "Omar Al-Khatib · Software Engineer, Zarqa",
  },
  {
    email: "hiba@linguabridge.demo",
    password: "Freelance#2026",
    role: { ar: "مستقلة", en: "Freelancer" },
    name: "Hiba Nasser · AI Engineer, Amman",
  },
  {
    email: "yousef@linguabridge.demo",
    password: "Freelance#2026",
    role: { ar: "مستقل", en: "Freelancer" },
    name: "Yousef Darwish · Cybersecurity Engineer, Irbid",
  },
] as const;

export function SignInForm() {
  const { t, lang } = useLang();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(lang === "ar" ? "تعذّر الاتصال بالخادم." : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <div className="lb-card p-6">
        <h1 className="text-xl font-bold">{t("signInTitle")}</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="lb-label" htmlFor="email">
              {t("email")}
            </label>
            <input
              id="email"
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
            <label className="lb-label" htmlFor="password">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              required
              className="lb-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--danger)" }} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="lb-btn lb-btn-primary w-full">
            {busy ? t("loading") : t("signIn")}
          </button>
        </form>

        <p className="mt-5 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-semibold" style={{ color: "var(--brand)" }}>
            {t("signUp")}
          </Link>
        </p>
      </div>

      <div className="lb-card p-6">
        <h2 className="font-semibold">{t("demoAccounts")}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("demoAccountsHint")}
        </p>

        <ul className="mt-4 space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setError(null);
                }}
                className="w-full rounded-lg border p-3 text-start transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{account.name}</span>
                  <span className="lb-chip shrink-0">{account.role[lang]}</span>
                </div>
                <div className="mt-1 text-xs" dir="ltr" style={{ color: "var(--text-muted)" }}>
                  {account.email} · {account.password}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
