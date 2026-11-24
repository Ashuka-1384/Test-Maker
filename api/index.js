import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function checkDb(res) {
  if (!supabase) {
    res.status(500).json({
      error: 'متغیرهای SUPABASE_URL و SUPABASE_KEY در فایل .env (برای لوکال) یا تنظیمات Vercel ست نشده‌اند.'
    });
    return false;
  }
  return true;
}

// اطمینان از وجود ادمین اصلی Ashuka
async function ensureSuperAdmin() {
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'Ashuka')
      .maybeSingle();

    if (!data) {
      await supabase.from('users').insert([
        { username: 'Ashuka', password: 'Matin1384', role: 'super_admin' }
      ]);
    } else if (data.role !== 'super_admin' || data.password !== 'Matin1384') {
      await supabase
        .from('users')
        .update({ role: 'super_admin', password: 'Matin1384' })
        .eq('username', 'Ashuka');
    }
  } catch (err) {
    console.error('Error ensuring super admin:', err.message);
  }
}

// بررسی وضعیت اتصال سرور و دیتابیس
app.get('/api/health', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      ok: false,
      error: 'فایل .env یافت نشد یا SUPABASE_URL و SUPABASE_KEY تنظیم نشده‌اند.'
    });
  }
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    return res.status(500).json({
      ok: false,
      error: `خطای اتصال به Supabase: ${error.message}`
    });
  }
  res.json({ ok: true, message: 'اتصال به دیتابیس Supabase برقرار است.' });
});

// 1. ثبت نام کاربر جدید
app.post('/api/register', async (req, res) => {
  if (!checkDb(res)) return;
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
  }
  const cleanUser = username.trim();
  if (cleanUser.toLowerCase() === 'ashuka') {
    return res.status(400).json({ error: 'این نام کاربری رزرو شده است.' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', cleanUser)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
  }

  const { data, error } = await supabase
    .from('users')
    .insert([{ username: cleanUser, password, role: 'user' }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});

// 2. ورود به سیستم
app.post('/api/login', async (req, res) => {
  if (!checkDb(res)) return;
  await ensureSuperAdmin();

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور را وارد کنید.' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.trim())
    .eq('password', password)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!user) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
  }

  res.json({ user });
});

// 3. دریافت لیست کاربران (برای ادمین اصلی جهت ارتقا به طراح آزمون)
app.get('/api/users', async (req, res) => {
  if (!checkDb(res)) return;
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, created_at')
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data || [] });
});

// 4. تغییر نقش کاربر توسط ادمین اصلی
app.post('/api/users/:id/role', async (req, res) => {
  if (!checkDb(res)) return;
  const { id } = req.params;
  const { role } = req.body;

  const { data: targetUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (!targetUser) return res.status(404).json({ error: 'کاربر یافت نشد.' });
  if (targetUser.username === 'Ashuka') {
    return res.status(400).json({ error: 'نقش ادمین اصلی قابل تغییر نیست.' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});

// 5. دریافت لیست تمام آزمون‌ها
app.get('/api/tests', async (req, res) => {
  if (!checkDb(res)) return;
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ tests: data || [] });
});

// 6. ساخت آزمون جدید
app.post('/api/tests', async (req, res) => {
  if (!checkDb(res)) return;
  const { title, max_score, pass_score, creator_id, creator_username, questions } = req.body;

  if (!title || !max_score || pass_score === undefined || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'لطفاً تمام فیلدها و حداقل یک سوال را وارد کنید.' });
  }

  const { data, error } = await supabase
    .from('tests')
    .insert([
      {
        title,
        max_score: Number(max_score),
        pass_score: Number(pass_score),
        creator_id,
        creator_username,
        questions
      }
    ])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ test: data });
});

// 7. حذف آزمون
app.delete('/api/tests/:id', async (req, res) => {
  if (!checkDb(res)) return;
  const { id } = req.params;
  const { error } = await supabase.from('tests').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 8. ثبت پاسخ‌های آزمون توسط کاربر
app.post('/api/attempts', async (req, res) => {
  if (!checkDb(res)) return;
  const { test_id, user_id, username, answers } = req.body;

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('*')
    .eq('id', test_id)
    .single();

  if (testError || !test) {
    return res.status(404).json({ error: 'آزمون یافت نشد.' });
  }

  const questions = test.questions || [];
  let correctCount = 0;

  const details = questions.map((q, idx) => {
    const selectedIndex = answers[idx] !== undefined ? Number(answers[idx]) : -1;
    const isCorrect = selectedIndex === Number(q.correctIndex);
    if (isCorrect) correctCount++;
    return {
      questionIndex: idx,
      questionText: q.text,
      options: q.options,
      selectedIndex,
      correctIndex: Number(q.correctIndex),
      isCorrect
    };
  });

  const rawScore = questions.length > 0 ? (correctCount / questions.length) * Number(test.max_score) : 0;
  const score = Math.round(rawScore * 100) / 100;
  const passed = score >= Number(test.pass_score);

  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert([
      {
        test_id: test.id,
        test_title: test.title,
        user_id,
        username,
        score,
        max_score: test.max_score,
        pass_score: test.pass_score,
        passed,
        details
      }
    ])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ attempt });
});

// 9. دریافت تاریخچه و نتایج آزمون‌ها
app.get('/api/attempts', async (req, res) => {
  if (!checkDb(res)) return;
  const { user_id, test_id } = req.query;

  let query = supabase
    .from('attempts')
    .select('*')
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (test_id) query = query.eq('test_id', test_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ attempts: data || [] });
});

// اجرای سرور لوکال برای npm run dev
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
    if (!supabase) {
      console.warn('⚠️ هشدار: فایل .env یافت نشد یا مقادیر SUPABASE_URL و SUPABASE_KEY خالی هستند!');
    } else {
      console.log('✅ اتصال اولیه به تنظیمات Supabase انجام شد.');
    }
  });
}

export default app;
