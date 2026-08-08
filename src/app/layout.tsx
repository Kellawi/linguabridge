import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Nav } from "@/components/Nav";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

/**
 * Every page in this app is either session-dependent or reads live database
 * state, so nothing may be prerendered at build time. Without this, Next.js
 * statically snapshots pages such as /jobs and /talent — which at build time
 * (no DATABASE_URL) would freeze the setup screen into the deployed output.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LinguaBridge — AI-assisted bilingual freelancing",
  description:
    "An AI-assisted bilingual (Arabic/English) freelancing platform for Arabic-speaking professionals. MSc thesis prototype, Kobe Institute of Computing.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the session in the root layout means a database outage should not
  // blank the whole site — the setup screen in page.tsx handles that case.
  let user = null;
  if (isDatabaseConfigured()) {
    try {
      user = await getSessionUser();
    } catch {
      user = null;
    }
  }

  // `lang`/`dir` start at Arabic — the primary language of the target users
  // (thesis §3.2.1 administered the survey in Arabic for the same reason).
  // LanguageProvider updates both attributes once the visitor's stored
  // preference is known.
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen">
        <LanguageProvider>
          <Nav user={user ? { fullName: user.fullName, role: user.role } : null} />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer
            className="mx-auto max-w-6xl px-4 py-10 text-center text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            LinguaBridge · MSc Information Systems thesis prototype · Kobe Institute of Computing
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
