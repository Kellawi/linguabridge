/**
 * Shown when DATABASE_URL is absent. A blank error page would leave a first-
 * time cloner guessing; this states exactly which step is missing.
 * Deliberately server-rendered and static — it must work when nothing else does.
 */
export function SetupNotice() {
  return (
    <div className="lb-card mx-auto max-w-2xl p-8" dir="ltr" lang="en">
      <h1 className="text-2xl font-bold">LinguaBridge needs one more setup step</h1>
      <p className="mt-3" style={{ color: "var(--text-muted)" }}>
        The application is running, but <code>DATABASE_URL</code> is not set, so it cannot
        reach a database yet.
      </p>

      <ol className="mt-6 space-y-4 text-sm">
        <li>
          <strong>1. Create a free Postgres database</strong>
          <p style={{ color: "var(--text-muted)" }}>
            Sign up at <strong>neon.tech</strong> (or Supabase) and copy the connection string.
          </p>
        </li>
        <li>
          <strong>2. Add it to your environment</strong>
          <pre
            className="mt-2 overflow-x-auto rounded-lg p-3 text-xs"
            style={{ background: "var(--surface-sunken)" }}
          >
{`cp .env.example .env
# paste your connection string into DATABASE_URL
# generate a session secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`}
          </pre>
        </li>
        <li>
          <strong>3. Create the tables and demo accounts</strong>
          <pre
            className="mt-2 overflow-x-auto rounded-lg p-3 text-xs"
            style={{ background: "var(--surface-sunken)" }}
          >
{`npm run db:setup
npm run db:seed`}
          </pre>
        </li>
      </ol>

      <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Full instructions are in <code>README.md</code>. AI provider keys are optional — without
        them the platform runs in mock mode and every screen still works.
      </p>
    </div>
  );
}
