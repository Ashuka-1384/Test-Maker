-- Test Maker — Supabase / PostgreSQL schema
-- این فایل هم برای نصب تازه و هم برای ارتقای دیتابیس نسخه قبلی قابل اجرا است.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO users (username, password, role)
VALUES ('Ashuka', 'Matin1384', 'super_admin')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  max_score INTEGER NOT NULL CHECK (max_score IN (20, 100)),
  pass_score NUMERIC NOT NULL,
  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  creator_username TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- مهاجرت افزایشی برای دیتابیس‌هایی که با نسخه قبلی ساخته شده‌اند
ALTER TABLE tests
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES tests(id) ON DELETE SET NULL,
  test_title TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score INTEGER NOT NULL,
  pass_score NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- در نسخه قبلی حذف آزمون می‌توانست به حذف کارنامه‌ها منجر شود.
-- این کلید خارجی طوری تنظیم می‌شود که در حذف فیزیکی احتمالی نیز کارنامه حفظ شود.
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_test_id_fkey;
ALTER TABLE attempts
  ADD CONSTRAINT attempts_test_id_fkey
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tests_active_created
  ON tests (is_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id
  ON attempts (test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id
  ON attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at
  ON attempts (created_at DESC);
