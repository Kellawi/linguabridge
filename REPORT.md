# LinguaBridge — Build Report

**Date:** 8 August 2026
**Repository:** <https://github.com/Kellawi/linguabridge> (public)
**Source specification:** *LinguaBridge: Design and Requirements Analysis of an AI-Assisted
Bilingual Freelancing Platform for Arabic-Speaking Professionals in Jordan* — MSc thesis, Bashar
KELLAWI, Kobe Institute of Computing.

---

## 1. Summary

A working prototype of the LinguaBridge platform has been built, tested against a live PostgreSQL
database and live AI provider calls, and published as a public repository. Four of the six MVP
features prioritised in thesis Table 4.2 are implemented, forming a complete end-to-end loop: an
employer posts work in Arabic, a freelancer reads and applies in Arabic, and the two negotiate
across the language boundary in a shared workspace.

The thesis records in §1.5 that "no functional prototype was built as part of this research." That
gap is now closed. This build is not a validation of the design — the thesis proposes a controlled
A/B pilot (§7.2) for that — but it is the artefact such a pilot would require.

**Status of the three stated requirements:**

| Requirement | Status |
| --- | --- |
| Never expose the API keys | Enforced by four independent mechanisms; verified against your real key values |
| Git-friendly, public GitHub repository | Published, CI green |
| Published as a live platform | Ready to deploy; one manual step remains (see §7) |

---

## 2. What was built

### Feature selection

Thesis Table 4.2 ranks six MVP features by the number of respondents (N=55) who named each their
*single* most valuable feature. You asked for "only the first few features, the most important
ones." Four were implemented — the top two by survey rank, plus the two that make them usable as a
marketplace rather than isolated tools.

| Thesis § | Feature | Rank | Why included |
| --- | --- | --- | --- |
| 4.3.2 | Bilingual job-brief generator + completeness checker | **1st, 27.3%** | Highest-demand feature |
| 4.3.5 | Real-time chat translation + shared glossary | **2nd, 21.8%** | Second-highest demand |
| 4.3.1 | Bilingual profile engine (translation, skill tagging, rate normalisation) | 4th, 12.7% | The thesis explicitly sequences this first regardless of rank: "a complete, well-formed profile is a precondition for participation in every later stage" |
| 4.3.4 | Guided proposal-writing tool | 6th, 10.9% | Targets the survey's single lowest-scoring item — confidence writing an English proposal, 2.29/5 — and without it there is no path from job to conversation |

**Deliberately excluded:** bilingual contract templates (3rd, 16.4%), explainable AI matching (5th,
10.9%), the delivery and acceptance rubric (§4.3.6), and the payments/compliance framework (§4.3.6).

### Technical stack

| Layer | Thesis §4.4 specifies | Built | Note |
| --- | --- | --- | --- |
| Presentation | React, responsive, RTL/LTR with dynamic switching | Next.js 15 App Router, React 19, Tailwind v4 | As specified |
| API | Node.js / Python FastAPI REST layer | Next.js route handlers | **Deviation** — co-locating the API with the frontend is what allows `server-only` to enforce the key boundary at compile time |
| AI services | Hosted LLM API wrapper | GPT-4o-mini → Gemini 2.5 Flash → mock | As specified, with automatic failover |
| Database | PostgreSQL | PostgreSQL (Neon) via postgres.js | As specified |
| Real-time chat | Redis | HTTP polling | **Deviation** — deploys on serverless without extra infrastructure; swappable for websockets without UI changes |
| Vector DB | Pinecone / Weaviate | Not built | Matching engine (§4.3.3) not in scope |
| Payments | JoMoPay, Zain Cash | Not built | See §6 |

Twelve source files under `src/lib`, fifteen React components, fourteen API route handlers, seven
database tables.

---

## 3. Security: how the API keys are protected

This was your stated top priority. Four independent mechanisms, so that no single mistake exposes a
key.

**1. Compile-time isolation.** `src/lib/env.ts` is the only module that reads secrets, and it begins
with `import "server-only"`. If any client component imports it — directly or through any chain of
imports — the build **fails with a hard error** rather than silently bundling a key. This is a
structural guarantee, not a convention someone has to remember.

**2. No public prefix.** Next.js inlines only `NEXT_PUBLIC_*` variables into the browser bundle. No
secret in this project carries that prefix, and the verification script fails the build if anyone
ever adds one.

**3. Server-side call path.** The browser never contacts OpenAI or Google. It calls this app's own
`/api/ai/*` routes, which authenticate the session, enforce a per-user rate limit (20 AI calls per
minute), and make the provider request server-side. Keys exist only in an outbound request header.
The Gemini key is sent as a header rather than a query parameter specifically so it cannot land in
proxy or server access logs. Provider errors are passed through a scrubber that redacts anything
key-shaped before logging, and unrecognised errors return a generic message so no provider detail
reaches the client.

**4. Automated verification.** `scripts/verify-no-secrets.ts` scans the compiled client bundle and
RSC payloads for key-shaped patterns *and* for the literal values of the real environment
variables, then exits non-zero on any hit. It runs in CI on every push.

Verified output from this machine, where both `OPENAI_API_KEY` and `GEMINI_API_KEY` are set:

```
Scanned 118 client-visible files.
Checked against 2 live secret value(s) from the environment.

PASS — no secrets found in client-visible build output.
```

That second line matters: this was not merely a pattern check. The scanner had your two actual key
values in hand and searched the entire compiled client output for them. Zero occurrences.

**Supporting measures:** `.env*` is gitignored except `.env.example`; only `.env.example` was ever
staged (the staged file list was inspected before the first commit); sessions are signed JWTs in
`httpOnly` + `sameSite=lax` + `secure` cookies; passwords are bcrypt-hashed; every database query
uses postgres.js tagged templates, which bind parameters rather than concatenating SQL; sign-in
returns an identical response for unknown-email and wrong-password so it cannot enumerate accounts;
conversation access is enforced in a single repository function, and a non-member gets the same
404 as a non-existent conversation.

---

## 4. Verification performed

All four features were exercised through the browser against a live Neon PostgreSQL database with
live GPT-4o-mini calls. Not simulated.

### 4.1 Bilingual profile engine (§4.3.1)

Input — colloquial Jordanian Arabic, informally stated rate:

> أنا مصمم جرافيك من إربد، صار لي ٣ سنين بالمجال. بشتغل على فوتوشوب وإليستريتور وفيغما […]
> حوالي ١٢ دينار بالساعة

All three functions the thesis specifies worked:

| Function | Result |
| --- | --- |
| Translation | Headline: `مصمم جرافيك متخصص في الخط العربي` / "Graphic Designer Specializing in Arabic Typography". Bio rendered into professional English. |
| Skill auto-tagging | 8 canonical Latin-script tags: Graphic Design, Photoshop, Illustrator, Figma, Visual Identity, Social Media Design, Arabic Typography, Arabic Calligraphy |
| Rate normalisation | `حوالي ١٢ دينار بالساعة` → **12 / JOD / hour** — parsed the Arabic-Indic numeral ١٢ and inferred the ISO currency from "دينار" |

### 4.2 Job-brief generator + completeness checker (§4.3.2)

Input — deliberately incomplete colloquial Arabic, with no budget and no deadline:

> بدنا حدا يعملنا تطبيق موبايل لمطعمنا في عمّان […]

| Output | Result |
| --- | --- |
| Bilingual title | `مطور تطبيق موبايل لمطعم في عمّان` / "Mobile App Developer for Restaurant in Amman" — colloquial input rendered as clean MSA |
| Bilingual summary | Structured professional English and Arabic |
| Deliverables | 6 index-aligned Arabic/English pairs |
| **Completeness score** | **40%** — correctly low |
| **Missing-constraint detection** | Two Arabic questions raised: *"ما هو الميزانية أو نطاق الميزانية لهذا المشروع؟"* and *"ما هو الموعد النهائي أو الجدول الزمني للمشروع؟"* |

The checker correctly identified exactly the two constraints that were withheld, and asked for them
in the author's own language. This is the §4.3.2 behaviour that addresses the 7.3% of respondents
who cited unclear job descriptions as their main barrier.

### 4.3 Guided proposal writing (§4.3.4)

Five structured questions answered in Arabic produced a professional English proposal plus an
Arabic verification copy (880 characters). Excerpt of the generated English:

> "I understand that you need a model to classify support tickets written in Modern Standard Arabic
> and colloquial Arabic into six categories while determining their priority levels. The solution
> must operate on a single server to ensure customer data privacy, without relying on external
> APIs. My approach will begin with analyzing the distribution of categories within the twelve
> thousand tickets…"

Every claim traces to an answer the applicant gave. Nothing was invented. The AI transparency badge
correctly displayed `المزوّد: GPT-4o-mini`.

### 4.4 Chat translation + shared glossary (§4.3.5)

The strongest single result. Arabic message sent, containing three terms present in the project
glossary:

> **Original (ar):** نعم، عرض **المخزون** في **مستودعين** بدل مستودع واحد يضيف نحو ثلاثة أيام عمل على الجدول الزمني. سأعدّل **الدفعة المرحلية** الثانية لتشمل هذا التغيير…

> **Translated (en):** "Yes, displaying the **inventory** in two **warehouses** instead of one adds about three working days to the timeline. I will adjust the second **milestone payment** to include this change…"

All three glossary bindings were honoured exactly: `المخزون → inventory`, `المستودع → warehouses`,
`دفعة مرحلية → milestone payment`. Database inspection confirmed `source_lang: ar → target_lang:
en`, `ai_provider: openai`, with the original body stored unmodified alongside the translation.

### 4.5 Other checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm run build` | Pass, 25 routes, all dynamic |
| `npm run verify:secrets` | Pass, against real key values |
| GitHub Actions CI | Green |
| Mock sign-in, all 4 demo accounts | Working; demo-account picker autofills correctly |
| Mock sign-up + auto profile creation | Working |
| Arabic RTL rendering, direction switching | Working; `<html dir>` updates on toggle |
| Seeded data renders | 2 jobs, 3 profiles, 1 proposal, 1 conversation, 4 glossary terms |
| Proposal submission → database | Confirmed |
| Database reset to clean documented state | Done — the seeded state now matches the README exactly |

---

## 5. Demo accounts

Seeded by `npm run db:seed`, published in the README, and listed on the sign-in page with
click-to-fill.

| Role | Email | Password |
| --- | --- | --- |
| Employer — Layla Mansour, Nawras Digital (Amman) | `employer@linguabridge.demo` | `Employer#2026` |
| Freelancer — Omar Al-Khatib, Software Engineer (Zarqa) | `omar@linguabridge.demo` | `Freelance#2026` |
| Freelancer — Hiba Nasser, AI Engineer (Amman) | `hiba@linguabridge.demo` | `Freelance#2026` |
| Freelancer — Yousef Darwish, Cybersecurity Engineer (Irbid) | `yousef@linguabridge.demo` | `Freelance#2026` |

The three freelancers mirror the survey cohort of thesis §5.1 — software, AI, and cybersecurity
engineering, distributed across Zarqa, Amman, and Irbid. These are fictional accounts whose
credentials protect nothing; they are published so anyone can explore the platform without
registering.

---

## 6. Limitations

Stated plainly, since this work sits next to an academic thesis.

**The compliance and payment framework is absent, and this is the most consequential gap.** Thesis
§6.2 and the qualitative consultations identify restricted banking access, ambiguous
self-employment taxation, and fear that declared income could affect UNHCR documentation as
barriers that language support alone does not remove. One consultant's point — that even a perfect
language solution leaves many people unable to receive the money — is not addressed by anything in
this build. No JoMoPay or Zain Cash integration exists. A freelancer could complete every workflow
here and still be unable to get paid.

**AI translation quality is unmeasured.** The outputs in §4 read well, but no systematic evaluation
was performed. The thesis cites Koehn and Knowles on hallucination, inconsistent terminology, and
weak dialect handling; none of those failure modes has been quantified here. The design mitigates
this by always keeping the original visible and requiring human approval before anything is
published, but mitigation is not measurement.

**Not production software.** No email verification, password reset, MFA, or login throttling. No
moderation, dispute resolution, or abuse reporting. Rate limiting is in-memory and per-instance; a
scaled deployment needs Redis, which thesis §4.4 already specifies.

**Effectiveness is not demonstrated.** This prototype does not show that the design works. It is a
precondition for the A/B pilot proposed in thesis §7.2, not a substitute for it.

**Two features from the implemented set have thin edges.** The completeness checker's score is a
model judgement, not a rubric-scored measure. The glossary applies only within a single
conversation, not across a freelancer's whole account.

---

## 7. Remaining step: going live

The repository is public and CI is green. One step needs your hands, because it requires signing
into an account:

1. Go to **[vercel.com/new](https://vercel.com/new)** and import `Kellawi/linguabridge`. Vercel
   detects Next.js automatically — no build configuration needed.
2. Under **Settings → Environment Variables**, add four values:
   - `DATABASE_URL` — the same Neon string now in your local `.env`
   - `SESSION_SECRET` — the same value from your local `.env`
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`

   Add these **in the Vercel dashboard only**. Do not commit them, and do not prefix any of them
   with `NEXT_PUBLIC_`.
3. Deploy.

The database is already migrated and seeded, so the deployment will have the demo accounts and
sample data on first load. Nothing further to run.

A note on hosting: this app cannot go on GitHub Pages. Keeping the keys private requires a server
to make the provider calls, and GitHub Pages serves static files only. Vercel, Netlify, and
Cloudflare Pages all work; Vercel needs the least configuration for Next.js.

---

## 8. Files of interest

| Path | What it is |
| --- | --- |
| `src/lib/env.ts` | The `server-only` secret boundary — the single most important file |
| `src/lib/ai/provider.ts` | GPT-4o-mini → Gemini failover chain, error scrubbing |
| `src/lib/ai/tasks.ts` | The four AI features as typed tasks, with their prompts |
| `src/lib/ai/mock.ts` | Deterministic offline mode so the app works with no keys |
| `scripts/verify-no-secrets.ts` | The bundle scanner |
| `db/schema.sql` | Seven tables, bilingual-by-construction |
| `db/seed.ts` | The demo population |
| `src/components/BilingualBlock.tsx` | The "original always available" rendering rule |
| `src/components/AiBadge.tsx` | The transparency marker required by design principle 3 |
