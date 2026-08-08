-- ===========================================================================
-- LinguaBridge — PostgreSQL schema
-- ===========================================================================
-- Applied by `npm run db:setup`. Idempotent: safe to re-run.
--
-- Bilingual convention: every piece of human-authored content is stored in
-- BOTH languages, alongside a `source_lang` column recording which side the
-- human actually wrote. Thesis §4.3.1 requires the original never be
-- discarded — the Arabic is not a derivative of the English, or vice versa.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- Users
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('employer', 'freelancer')),
  full_name       TEXT NOT NULL,
  company         TEXT,
  city            TEXT,
  preferred_lang  TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_lang IN ('ar', 'en')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- --------------------------------------------------------------------------
-- Freelancer profiles  (thesis §4.3.1 — Bilingual Profile Engine)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS freelancer_profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline_ar    TEXT NOT NULL DEFAULT '',
  headline_en    TEXT NOT NULL DEFAULT '',
  bio_ar         TEXT NOT NULL DEFAULT '',
  bio_en         TEXT NOT NULL DEFAULT '',
  skills         TEXT[] NOT NULL DEFAULT '{}',
  rate_amount    NUMERIC(10, 2),
  rate_currency  TEXT,
  rate_unit      TEXT CHECK (rate_unit IN ('hour', 'project', 'day')),
  source_lang    TEXT NOT NULL DEFAULT 'ar' CHECK (source_lang IN ('ar', 'en')),
  published      BOOLEAN NOT NULL DEFAULT false,
  -- Which provider generated the current draft; NULL once fully hand-edited.
  ai_provider    TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS freelancer_profiles_skills_idx
  ON freelancer_profiles USING GIN (skills);

-- --------------------------------------------------------------------------
-- Jobs  (thesis §4.3.2 — Bilingual Job Brief Generator)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_ar         TEXT NOT NULL DEFAULT '',
  title_en         TEXT NOT NULL DEFAULT '',
  summary_ar       TEXT NOT NULL DEFAULT '',
  summary_en       TEXT NOT NULL DEFAULT '',
  deliverables_ar  JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables_en  JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills           TEXT[] NOT NULL DEFAULT '{}',
  budget_amount    NUMERIC(10, 2),
  budget_currency  TEXT DEFAULT 'USD',
  deadline         TEXT,
  source_lang      TEXT NOT NULL DEFAULT 'ar' CHECK (source_lang IN ('ar', 'en')),
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  -- Score 0-100 from the constraint-completeness checker.
  completeness     INTEGER NOT NULL DEFAULT 0,
  ai_provider      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_employer_idx ON jobs (employer_id);
CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_skills_idx ON jobs USING GIN (skills);

-- --------------------------------------------------------------------------
-- Proposals  (thesis §4.3.4 — Guided Proposal Writing Tool)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  freelancer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The five structured answers the freelancer gave, in their own language.
  answers        JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_en        TEXT NOT NULL DEFAULT '',
  body_ar        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'submitted'
                   CHECK (status IN ('draft', 'submitted', 'accepted', 'declined')),
  ai_provider    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One proposal per freelancer per job.
  UNIQUE (job_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS proposals_job_idx ON proposals (job_id);
CREATE INDEX IF NOT EXISTS proposals_freelancer_idx ON proposals (freelancer_id);

-- --------------------------------------------------------------------------
-- Conversations + messages  (thesis §4.3.5 — Real-Time Chat Translation)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  freelancer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, freelancer_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Exactly as the sender typed it. Never overwritten.
  body             TEXT NOT NULL,
  source_lang      TEXT NOT NULL CHECK (source_lang IN ('ar', 'en')),
  -- AI translation, shown alongside (not instead of) the original.
  translated       TEXT,
  target_lang      TEXT CHECK (target_lang IN ('ar', 'en')),
  ai_provider      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages (conversation_id, created_at);

-- Shared project glossary, editable by both parties (thesis §4.3.5).
CREATE TABLE IF NOT EXISTS glossary_terms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  term_en          TEXT NOT NULL,
  term_ar          TEXT NOT NULL,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, term_en)
);

CREATE INDEX IF NOT EXISTS glossary_conversation_idx ON glossary_terms (conversation_id);
