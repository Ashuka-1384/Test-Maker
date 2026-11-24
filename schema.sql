-- جداول دیتابیس PostgreSQL در Supabase

-- 1. جدول کاربران
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'super_admin' | 'designer' | 'user'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ایجاد ادمین اصلی پیش‌فرض
INSERT INTO users (username, password, role)
VALUES ('Ashuka', 'Matin1384', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 2. جدول آزمون‌ها
CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  max_score INTEGER NOT NULL CHECK (max_score IN (20, 100)),
  pass_score NUMERIC NOT NULL,
  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  creator_username TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول نتایج آزمون‌ها
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  test_title TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score INTEGER NOT NULL,
  pass_score NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
