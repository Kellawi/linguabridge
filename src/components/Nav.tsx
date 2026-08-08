"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { LANG_LABEL, otherLang } from "@/lib/language";
import { useLang } from "@/components/LanguageProvider";

export interface NavUser {
  fullName: string;
  role: "employer" | "freelancer";
}

export function Nav({ user }: { user: NavUser | null }) {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const links = user
    ? user.role === "employer"
      ? [
          { href: "/dashboard", label: t("nav_dashboard") },
          { href: "/jobs/new", label: t("nav_postJob") },
          { href: "/talent", label: t("nav_talent") },
          { href: "/messages", label: t("nav_messages") },
        ]
      : [
          { href: "/dashboard", label: t("nav_dashboard") },
          { href: "/jobs", label: t("nav_jobs") },
          { href: "/profile", label: t("nav_profile") },
          { href: "/messages", label: t("nav_messages") },
        ]
    : [{ href: "/jobs", label: t("nav_jobs") }];

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
    >
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-sm text-white"
            style={{ background: "var(--brand)" }}
            aria-hidden
          >
            ل
          </span>
          <span style={{ color: "var(--text)" }}>{t("appName")}</span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--brand)" : "var(--text-muted)",
                  background: active ? "var(--brand-soft)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(otherLang(lang))}
            className="lb-btn lb-btn-secondary !px-3 !py-1.5 !text-sm"
            aria-label={t("language")}
            title={t("language")}
          >
            <span aria-hidden>🌐</span>
            {LANG_LABEL[otherLang(lang)]}
          </button>

          {user ? (
            <>
              <span className="hidden text-sm sm:inline" style={{ color: "var(--text-muted)" }}>
                {user.fullName}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="lb-btn lb-btn-ghost !px-3 !py-1.5 !text-sm"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="lb-btn lb-btn-ghost !px-3 !py-1.5 !text-sm">
                {t("signIn")}
              </Link>
              <Link href="/signup" className="lb-btn lb-btn-primary !px-3 !py-1.5 !text-sm">
                {t("signUp")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
