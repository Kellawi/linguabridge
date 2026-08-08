# LinguaBridge

**An AI-assisted bilingual (Arabic/English) freelancing platform for Arabic-speaking professionals.**

A working prototype of the platform designed in the MSc thesis *"LinguaBridge: Design and
Requirements Analysis of an AI-Assisted Bilingual Freelancing Platform for Arabic-Speaking
Professionals in Jordan"* — Bashar KELLAWI, Kobe Institute of Computing, Graduate School of
Information Technology.

The thesis states that "no functional prototype was built as part of this research" (§1.5). This
repository is that prototype, built afterwards from the thesis specification.

---

## The problem this addresses

From a survey of 55 respondents across Amman, Zarqa and Irbid (February 2026):

| Finding | Value |
| --- | --- |
| Had never used a formal freelancing platform | 74.5% |
| Named a language-linked barrier as their single main obstacle | 40.0% |
| Mean confidence writing an English proposal | **2.29 / 5** (lowest item in the survey) |
| Agreed Arabic job briefs would significantly help | 85.5% |
| Mean likelihood of using LinguaBridge | 4.11 / 5 |

The design principle behind every screen: **language should never be the reason a skilled
professional cannot work.**

---

## Demo accounts

The database seed creates one employer and three freelancers. On the sign-in page, click any
account in the right-hand panel to fill the form automatically.

| Role | Email | Password |
| --- | --- | --- |
| **Employer** — Layla Mansour, Nawras Digital (Amman) | `employer@linguabridge.demo` | `Employer#2026` |
| **Freelancer** — Omar Al-Khatib, Software Engineer (Zarqa) | `omar@linguabridge.demo` | `Freelance#2026` |
| **Freelancer** — Hiba Nasser, AI Engineer (Amman) | `hiba@linguabridge.demo` | `Freelance#2026` |
| **Freelancer** — Yousef Darwish, Cybersecurity Engineer (Irbid) | `yousef@linguabridge.demo` | `Freelance#2026` |

> These are **fictional demonstration accounts**. Their credentials are published here on purpose
> so anyone can explore the platform without registering — they protect nothing. Never reuse these
> passwords, and never run `npm run db:seed` against a deployment holding real user data.

The three freelancer profiles mirror the survey cohort of thesis §5.1 — software, AI, and
cybersecurity engineering, distributed across the three surveyed cities.

---

## Implemented features

The thesis ranks six MVP features by the number of respondents who named each their *single* most
valuable feature (Table 4.2). This build implements four of them — the end-to-end core loop.

| Thesis | Feature | Survey rank | What it does |
| --- | --- | --- | --- |
| §4.3.1 | **Bilingual profile engine** | 4th (12.7%) | Freelancer writes about themselves in Arabic; the system produces a professional English version, auto-tags canonical skills, and normalises an informally-stated rate into amount + currency + unit. Sequenced first because a complete profile is a precondition for every later stage. |
| §4.3.2 | **Bilingual job-brief generator** + completeness checker | **1st (27.3%)** | Employer describes the work in either language; the system produces a structured brief in both, with index-aligned deliverables, then audits it for missing budget, deadline, scope, format and acceptance criteria before publication. |
| §4.3.4 | **Guided proposal writing** | 6th (10.9%) | Five structured questions answered in the freelancer's own language become a professional English proposal, with an Arabic version alongside so they can verify what is being sent in their name. Targets the survey's lowest-scoring item. |
| §4.3.5 | **Real-time chat translation** + shared glossary | **2nd (21.8%)** | Each party writes in their own language. Translations appear beside the original, never instead of it. A glossary editable by both parties is injected into every later translation so terminology stays consistent. |

**Not implemented in this build:** bilingual contract templates (3rd, 16.4%), explainable AI
matching (5th, 10.9%), the delivery/acceptance rubric (§4.3.6), and the payments and compliance
framework (§4.3.6). See *Limitations* below.

---

## Security: how API keys stay private

This was the project's hardest requirement. Four independent mechanisms enforce it.

**1. Compile-time isolation.** `src/lib/env.ts` — the only module that reads secrets — begins with
`import "server-only"`. If any client component ever imports it, directly or through a chain, the
build **fails** rather than silently shipping a key to the browser.

**2. No public prefix.** Next.js inlines only `NEXT_PUBLIC_*` variables into the browser bundle.
No secret in this project carries that prefix, and `scripts/verify-no-secrets.ts` fails the build
if someone ever adds one.

**3. Server-side call path.** The browser never talks to OpenAI or Google. It calls this app's own
`/api/ai/*` routes; those routes authenticate the session, rate-limit the user (20 AI calls/minute),
and make the provider request server-side. Keys exist only in an outbound request header. Provider
errors are scrubbed of anything key-shaped before being logged, and unexpected errors return a
generic message so no provider detail reaches the client.

**4. Automated verification.** `npm run verify:secrets` scans the compiled client bundle and RSC
payloads for key-shaped strings *and* for the literal values of your real environment variables,
then exits non-zero on any hit. It runs in CI on every push.

```bash
npm run build && npm run verify:secrets
```

```
Scanned 118 client-visible files.
Checked against 2 live secret value(s) from the environment.

PASS — no secrets found in client-visible build output.
```

Additionally: `.env*` is gitignored (except `.env.example`), sessions are signed JWTs in `httpOnly`,
`sameSite=lax`, `secure` cookies, passwords are bcrypt-hashed, and every database query uses
postgres.js tagged templates, which bind parameters rather than concatenating SQL.

---

## Local setup

**Requirements:** Node.js 20+ and a PostgreSQL database.

### 1. Install

```bash
git clone https://github.com/Kellawi/linguabridge.git
cd linguabridge
npm install
```

### 2. Create a database

Create a free Postgres database at **[neon.tech](https://neon.tech)** (recommended) or
[supabase.com](https://supabase.com), and copy the connection string. For Supabase, use the
**Connection pooling** URI (port 6543).

### 3. Configure the environment

```bash
cp .env.example .env
```

Open `.env` and set:

- `DATABASE_URL` — your connection string.
- `SESSION_SECRET` — generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `OPENAI_API_KEY` and `GEMINI_API_KEY` — **optional.** Without them the app runs in mock mode and
  every screen still works; output is clearly labelled as placeholder text. Add them whenever you
  want live AI. No code changes are needed either way.

### 4. Create the tables and demo data

```bash
npm run db:setup
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with any account from the table above.

---

## Deploying to Vercel

The app needs a server at runtime — that is precisely what keeps the keys private — so it cannot be
hosted on a static host such as GitHub Pages.

1. Push this repository to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repository. Vercel detects Next.js
   automatically; no build configuration is required.
3. Under **Settings → Environment Variables**, add `DATABASE_URL`, `SESSION_SECRET`,
   `OPENAI_API_KEY`, and `GEMINI_API_KEY`. **Add them in the Vercel dashboard only — never commit
   them.** Do not prefix any of them with `NEXT_PUBLIC_`.
4. Deploy. Then run `npm run db:setup && npm run db:seed` locally, pointed at the same
   `DATABASE_URL`, to create the tables and demo accounts.

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:setup` | Apply `db/schema.sql` (idempotent) |
| `npm run db:seed` | Insert demo accounts and data (idempotent) |
| `npm run db:reset` | Drop everything, recreate, reseed — **destructive** |
| `npm run verify:secrets` | Scan the build output for leaked secrets |

---

## Architecture

Follows the layered design of thesis §4.4, with substitutions noted.

```
Presentation   Next.js 15 App Router, React 19, Tailwind CSS v4
               Full RTL/LTR support with dynamic direction switching
                   |
API layer      Next.js route handlers (/api/**)
               Session auth · Zod validation · per-user AI rate limiting
                   |
AI services    src/lib/ai/  — server-only
               GPT-4o-mini (primary) -> Gemini 2.5 Flash (backup) -> mock
                   |
Data           PostgreSQL via postgres.js
```

**Deviations from the thesis architecture, and why:**

- **Backend:** Next.js route handlers instead of a separate Node/FastAPI service. Co-locating the
  API with the frontend is what allows `server-only` to enforce the key boundary at compile time.
- **Chat transport:** HTTP polling instead of Redis-backed real-time state (§4.4). Polling deploys
  on serverless without extra infrastructure and is swappable for a websocket without UI changes.
- **Matching:** not implemented, so no vector database. The multilingual-embedding matching engine
  of §4.3.3 is future work.

### Project layout

```
db/           schema.sql, setup.ts, seed.ts
scripts/      verify-no-secrets.ts
src/app/      pages and route handlers
src/lib/      ai/ (server-only), db, auth, env, repo, i18n, language
src/components/
```

---

## Design principles in the code

The five principles of thesis §4.1, and where each is visible:

1. **Language inclusivity** — no language is canonical. Every content table stores both sides plus
   a `source_lang` column recording which the human wrote. `BilingualBlock` renders either side.
2. **AI assists, never replaces** — every AI route returns a *draft*. A separate, human-triggered
   endpoint writes to the record. The AI cannot publish a profile, a brief, or a proposal.
3. **Transparency** — `AiBadge` labels every block of model output with the provider that produced
   it, and distinguishes live output from mock text. Chat keeps the original beside the translation.
4. **Compliance awareness** — acknowledged in the data model, not yet implemented. See below.
5. **Progressive complexity** — each feature starts with one free-text box and expands into
   editable structure only after the AI has produced something to edit.

---

## Limitations

Stated plainly, since this is thesis-adjacent work.

- **Not production software.** No email verification, password reset, MFA, or login throttling. No
  moderation, dispute resolution, or abuse reporting.
- **The compliance and payment framework is absent.** Thesis §6.2 and the qualitative findings
  identify banking access, employment-status ambiguity, and UNHCR documentation concerns as
  barriers that language support alone does not solve — one consultant's point was that even a
  perfect language solution leaves many unable to receive money. No payment integration
  (JoMoPay, Zain Cash) exists here. That gap is the most consequential one in this build.
- **AI translation is unverified.** No evaluation of translation quality, no measurement of the
  hallucination and dialect-handling failure modes the thesis cites, and no human review loop
  beyond the user's own editing.
- **Rate limiting is per-instance,** held in memory. A horizontally-scaled deployment would need
  Redis, which thesis §4.4 already specifies in the data layer.
- **Effectiveness is not demonstrated.** This prototype does not validate that the design works.
  The thesis proposes a controlled A/B pilot (§7.2) as the instrument for that; this build is a
  precondition for running one, not a substitute for it.

---

## License

MIT — see [LICENSE](LICENSE).

The thesis text, survey instrument, and survey data are **not** covered by this license and remain
the author's academic work.
