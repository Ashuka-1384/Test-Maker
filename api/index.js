import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function checkDb(res) {
  if (!supabase) {
    res.status(500).json({
      error: 'متغیرهای SUPABASE_URL و SUPABASE_KEY در فایل .env یا تنظیمات Vercel تنظیم نشده‌اند.'
    });
    return false;
  }
  return true;
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'آزمون باید حداقل یک سؤال داشته باشد.';
  }

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      return `ساختار سؤال شماره ${index + 1} معتبر نیست.`;
    }
    const type = question.type || 'single_choice';
    const expectedOptions = type === 'true_false' ? 2 : 4;
    if (!['single_choice', 'multiple_choice', 'true_false'].includes(type)) {
      return `نوع سؤال شماره ${index + 1} معتبر نیست.`;
    }
    if (typeof question.text !== 'string' || !question.text.trim()) {
      return `متن سؤال شماره ${index + 1} معتبر نیست.`;
    }
    if (!Array.isArray(question.options) || question.options.length !== expectedOptions ||
        question.options.some((option) => typeof option !== 'string' || !option.trim())) {
      return type === 'true_false'
        ? `سؤال درست/نادرست شماره ${index + 1} باید دو گزینه داشته باشد.`
        : `سؤال شماره ${index + 1} باید دقیقاً چهار گزینه کامل داشته باشد.`;
    }

    if (type === 'multiple_choice') {
      const correctIndices = question.correctIndices;
      if (!Array.isArray(correctIndices) || correctIndices.length < 2 ||
          correctIndices.some((value) => !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) >= expectedOptions) ||
          new Set(correctIndices.map(Number)).size !== correctIndices.length) {
        return `برای سؤال چندپاسخی شماره ${index + 1} حداقل دو پاسخ صحیح متفاوت انتخاب کنید.`;
      }
    } else if (question.correctIndex === null || question.correctIndex === undefined || String(question.correctIndex).trim() === '' ||
        !Number.isInteger(Number(question.correctIndex)) || Number(question.correctIndex) < 0 || Number(question.correctIndex) >= expectedOptions) {
      return `پاسخ صحیح سؤال شماره ${index + 1} انتخاب نشده است.`;
    }

    const weight = question.weight === undefined ? 1 : Number(question.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      return `وزن سؤال شماره ${index + 1} باید عددی بین ۰ و ۱۰۰ باشد.`;
    }
  }
  return null;
}

function validateTestPayload(payload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const maxScore = Number(payload.max_score);
  const passScore = Number(payload.pass_score);

  if (!title) return { error: 'عنوان آزمون را وارد کنید.' };
  if (![20, 100].includes(maxScore)) {
    return { error: 'سقف نمره آزمون باید ۲۰ یا ۱۰۰ باشد.' };
  }
  if (!Number.isFinite(passScore) || passScore < 0 || passScore > maxScore) {
    return { error: 'نمره قبولی باید بین صفر و سقف نمره آزمون باشد.' };
  }
  const questionError = validateQuestions(payload.questions);
  if (questionError) return { error: questionError };

  const questions = payload.questions.map((question) => ({
    ...question,
    type: question.type || 'single_choice',
    text: question.text.trim(),
    options: question.options.map((option) => option.trim()),
    correctIndex: question.type === 'multiple_choice' ? null : Number(question.correctIndex),
    correctIndices: question.type === 'multiple_choice' ? question.correctIndices.map(Number).sort((a, b) => a - b) : [],
    weight: question.weight === undefined ? 1 : Number(question.weight),
    explanation: typeof question.explanation === 'string' ? question.explanation.trim() : ''
  }));

  // پیش‌فرض: شرکت چندباره مجاز است (سازگار با آزمون‌های قبلی)
  const allowMultiple = payload.allow_multiple_attempts === undefined
    ? true
    : payload.allow_multiple_attempts === true || payload.allow_multiple_attempts === 'true';

  return {
    value: {
      title,
      max_score: maxScore,
      pass_score: passScore,
      questions,
      allow_multiple_attempts: allowMultiple
    }
  };
}

const MIGRATION_MESSAGE =
  'ستون allow_multiple_attempts در دیتابیس وجود ندارد. فایل schema.sql را یک‌بار در SQL Editor سوپابیس اجرا کنید.';

function isMissingAttemptColumn(error) {
  return Boolean(error && /allow_multiple_attempts/i.test(error.message || ''));
}

// اطمینان از وجود ادمین اصلی پیش‌فرض
async function ensureSuperAdmin() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'Ashuka')
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const { error: insertError } = await supabase.from('users').insert([
        { username: 'Ashuka', password: 'Matin1384', role: 'super_admin' }
      ]);
      if (insertError) throw insertError;
    } else if (data.role !== 'super_admin' || data.password !== 'Matin1384') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'super_admin', password: 'Matin1384' })
        .eq('username', 'Ashuka');
      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Error ensuring super admin:', error.message);
  }
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  if (!checkDb(res)) return;
  const checks = await Promise.all([
    supabase.from('users').select('id').limit(1),
    supabase.from('tests').select('id, is_archived, allow_multiple_attempts').limit(1),
    supabase.from('attempts').select('id, test_id').limit(1)
  ]);
  const failed = checks.find((result) => result.error);
  if (failed) {
    return res.status(500).json({
      ok: false,
      error: isMissingAttemptColumn(failed.error)
        ? MIGRATION_MESSAGE
        : `بررسی دیتابیس ناموفق بود: ${failed.error.message}. فایل schema.sql نسخه جدید را در Supabase اجرا کنید.`
    });
  }
  return res.json({ ok: true, message: 'اتصال جداول اصلی Supabase برقرار است.' });
}));

app.post('/api/register', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!username || !password.trim()) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
  }
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'نام کاربری باید بین ۳ تا ۳۲ نویسه باشد.' });
  }
  if (username.toLowerCase() === 'ashuka') {
    return res.status(400).json({ error: 'این نام کاربری رزرو شده است.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'رمز عبور باید حداقل ۴ نویسه باشد.' });
  }

  const { data: existing, error: lookupError } = await supabase
    .from('users').select('id').ilike('username', username).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (existing) return res.status(409).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });

  const { data, error } = await supabase
    .from('users')
    .insert([{ username, password, role: 'user' }])
    .select('id, username, role, created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ user: data });
}));

app.post('/api/login', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  await ensureSuperAdmin();
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور را وارد کنید.' });
  }

  const { data: user, error } = await supabase
    .from('users').select('id, username, role, created_at, password')
    .eq('username', username).eq('password', password).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
  const { password: _password, ...safeUser } = user;
  return res.json({ user: safeUser });
}));

app.get('/api/users', asyncRoute(async (_req, res) => {
  if (!checkDb(res)) return;
  const { data, error } = await supabase
    .from('users').select('id, username, role, created_at').order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ users: data || [] });
}));

app.post('/api/users/:id/role', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const role = req.body.role;
  if (!['user', 'designer'].includes(role)) {
    return res.status(400).json({ error: 'نقش انتخاب‌شده معتبر نیست.' });
  }
  const { data: targetUser, error: lookupError } = await supabase
    .from('users').select('id, username').eq('id', req.params.id).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!targetUser) return res.status(404).json({ error: 'کاربر یافت نشد.' });
  if (targetUser.username.toLowerCase() === 'ashuka') {
    return res.status(400).json({ error: 'نقش ادمین اصلی قابل تغییر نیست.' });
  }
  const { data, error } = await supabase
    .from('users').update({ role }).eq('id', req.params.id)
    .select('id, username, role, created_at').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ user: data });
}));

app.get('/api/tests', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  let query = supabase.from('tests').select('*').order('created_at', { ascending: false });
  if (req.query.include_archived !== 'true') query = query.eq('is_archived', false);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ tests: data || [] });
}));

app.post('/api/tests', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const validated = validateTestPayload(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const creatorId = Number(req.body.creator_id);
  const creatorUsername = typeof req.body.creator_username === 'string'
    ? req.body.creator_username.trim() : '';
  if (!Number.isInteger(creatorId) || creatorId <= 0 || !creatorUsername) {
    return res.status(400).json({ error: 'اطلاعات طراح آزمون معتبر نیست.' });
  }

  const row = {
    ...validated.value,
    creator_id: creatorId,
    creator_username: creatorUsername,
    is_archived: false
  };
  let { data, error } = await supabase.from('tests').insert([row]).select('*').single();

  if (error && isMissingAttemptColumn(error)) {
    // دیتابیس هنوز مهاجرت نشده: آزمون چندباره همچنان ساخته می‌شود، حالت «یک‌بار» نیازمند مهاجرت است.
    if (row.allow_multiple_attempts === false) {
      return res.status(409).json({ error: MIGRATION_MESSAGE });
    }
    const { allow_multiple_attempts: _ignored, ...legacyRow } = row;
    ({ data, error } = await supabase.from('tests').insert([legacyRow]).select('*').single());
  }
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ test: data });
}));

app.put('/api/tests/:id', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const validated = validateTestPayload(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });

  const { data: current, error: currentError } = await supabase
    .from('tests').select('id, creator_id, is_archived').eq('id', req.params.id).maybeSingle();
  if (currentError) return res.status(500).json({ error: currentError.message });
  if (!current || current.is_archived) return res.status(404).json({ error: 'آزمون فعال پیدا نشد.' });

  const { count, error: attemptsError } = await supabase
    .from('attempts').select('id', { count: 'exact', head: true }).eq('test_id', req.params.id);
  if (attemptsError) return res.status(500).json({ error: attemptsError.message });
  if ((count || 0) > 0) {
    return res.status(409).json({ error: 'این آزمون سابقه شرکت‌کننده دارد؛ برای حفظ صحت کارنامه‌ها، ویرایش آن غیرفعال است. یک آزمون جدید از روی آن بسازید.' });
  }

  let { data, error } = await supabase
    .from('tests').update(validated.value).eq('id', req.params.id).select('*').single();
  if (error && isMissingAttemptColumn(error)) {
    if (validated.value.allow_multiple_attempts === false) {
      return res.status(409).json({ error: MIGRATION_MESSAGE });
    }
    const { allow_multiple_attempts: _ignored, ...legacyValue } = validated.value;
    ({ data, error } = await supabase
      .from('tests').update(legacyValue).eq('id', req.params.id).select('*').single());
  }
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ test: data });
}));

// تغییر سیاست تعداد دفعات شرکت؛ برخلاف ویرایش کامل، حتی پس از ثبت کارنامه هم مجاز است
// چون روی معنای کارنامه‌های قبلی اثری ندارد.
app.patch('/api/tests/:id/attempt-policy', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const userId = Number(req.body.user_id);
  if (typeof req.body.allow_multiple_attempts !== 'boolean') {
    return res.status(400).json({ error: 'مقدار سیاست تعداد دفعات شرکت معتبر نیست.' });
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'اطلاعات کاربر معتبر نیست.' });
  }

  const [{ data: actor, error: actorError }, { data: test, error: testError }] = await Promise.all([
    supabase.from('users').select('id, role').eq('id', userId).maybeSingle(),
    supabase.from('tests').select('id, creator_id, is_archived').eq('id', req.params.id).maybeSingle()
  ]);
  if (actorError) return res.status(500).json({ error: actorError.message });
  if (testError) return res.status(500).json({ error: testError.message });
  if (!actor) return res.status(401).json({ error: 'کاربر یافت نشد.' });
  if (!test || test.is_archived) return res.status(404).json({ error: 'آزمون فعال پیدا نشد.' });
  if (actor.role !== 'super_admin' && test.creator_id !== actor.id) {
    return res.status(403).json({ error: 'فقط طراح آزمون یا ادمین اصلی می‌تواند این تنظیم را تغییر دهد.' });
  }

  const { data, error } = await supabase
    .from('tests').update({ allow_multiple_attempts: req.body.allow_multiple_attempts })
    .eq('id', req.params.id).select('*').single();
  if (error) {
    return res.status(isMissingAttemptColumn(error) ? 409 : 500)
      .json({ error: isMissingAttemptColumn(error) ? MIGRATION_MESSAGE : error.message });
  }
  return res.json({ test: data });
}));

// حذف آزمون به صورت آرشیو انجام می‌شود تا کارنامه‌های قبلی حفظ شوند.
app.delete('/api/tests/:id', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const { data, error } = await supabase
    .from('tests').update({ is_archived: true }).eq('id', req.params.id)
    .eq('is_archived', false).select('id').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'آزمون پیدا نشد یا قبلاً آرشیو شده است.' });
  return res.json({ success: true, archived: true });
}));

app.post('/api/attempts', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  const testId = Number(req.body.test_id);
  const userId = Number(req.body.user_id);
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  if (!Number.isInteger(testId) || testId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'اطلاعات آزمون یا شرکت‌کننده معتبر نیست.' });
  }

  const { data: test, error: testError } = await supabase
    .from('tests').select('*').eq('id', testId).eq('is_archived', false).maybeSingle();
  if (testError) return res.status(500).json({ error: testError.message });
  if (!test) return res.status(404).json({ error: 'آزمون پیدا نشد یا دیگر فعال نیست.' });

  // اعمال سیاست «فقط یک‌بار شرکت» در سمت سرور (نه فقط در رابط کاربری)
  const singleAttemptOnly = test.allow_multiple_attempts === false;
  if (singleAttemptOnly) {
    const { count: previousCount, error: previousError } = await supabase
      .from('attempts').select('id', { count: 'exact', head: true })
      .eq('test_id', test.id).eq('user_id', userId);
    if (previousError) return res.status(500).json({ error: previousError.message });
    if ((previousCount || 0) > 0) {
      return res.status(409).json({
        code: 'ATTEMPT_LIMIT_REACHED',
        error: 'این آزمون فقط یک‌بار قابل شرکت است و شما قبلاً در آن شرکت کرده‌اید.'
      });
    }
  }

  const questions = Array.isArray(test.questions) ? test.questions : [];
  const totalWeight = questions.reduce((sum, question) => {
    const weight = Number(question.weight ?? 1);
    return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1);
  }, 0);
  let earnedWeight = 0;
  let correctCount = 0;

  const details = questions.map((question, index) => {
    const type = question.type || 'single_choice';
    const rawSelected = answers[index];
    const weight = Number(question.weight ?? 1) || 1;
    let selectedIndex = -1;
    let selectedIndices = [];
    let correctIndex = null;
    let correctIndices = [];
    let isCorrect = false;

    if (type === 'multiple_choice') {
      const incoming = Array.isArray(rawSelected) ? rawSelected : [];
      selectedIndices = [...new Set(incoming.map(Number).filter((value) =>
        Number.isInteger(value) && value >= 0 && value < question.options.length
      ))].sort((a, b) => a - b);
      correctIndices = Array.isArray(question.correctIndices)
        ? question.correctIndices.map(Number).sort((a, b) => a - b) : [];
      isCorrect = selectedIndices.length === correctIndices.length &&
        selectedIndices.every((value, answerIndex) => value === correctIndices[answerIndex]);
    } else {
      const optionCount = Array.isArray(question.options) ? question.options.length : 0;
      const candidate = rawSelected === undefined || rawSelected === null || rawSelected === ''
        ? -1 : Number(rawSelected);
      selectedIndex = Number.isInteger(candidate) && candidate >= 0 && candidate < optionCount ? candidate : -1;
      correctIndex = Number(question.correctIndex);
      isCorrect = selectedIndex === correctIndex;
    }

    if (isCorrect) {
      correctCount += 1;
      earnedWeight += weight;
    }

    return {
      questionIndex: index,
      type,
      questionText: question.text,
      options: question.options,
      selectedIndex,
      selectedIndices,
      correctIndex,
      correctIndices,
      weight,
      explanation: question.explanation || '',
      isCorrect
    };
  });

  const rawScore = totalWeight > 0 ? (earnedWeight / totalWeight) * Number(test.max_score) : 0;
  const score = Math.round(rawScore * 100) / 100;
  const passed = score >= Number(test.pass_score);
  const { data: attempt, error } = await supabase.from('attempts').insert([{
    test_id: test.id,
    test_title: test.title,
    user_id: userId,
    username: typeof req.body.username === 'string' ? req.body.username.trim() : 'کاربر',
    score,
    max_score: test.max_score,
    pass_score: test.pass_score,
    passed,
    details
  }]).select('*').single();

  if (error) return res.status(500).json({ error: error.message });

  // محافظت در برابر ارسال هم‌زمان دو درخواست: اگر بیش از یک کارنامه ثبت شد، کارنامه جدیدتر برگردانده می‌شود.
  if (singleAttemptOnly) {
    const { data: duplicates } = await supabase
      .from('attempts').select('id').eq('test_id', test.id).eq('user_id', userId)
      .order('id', { ascending: true });
    if (duplicates && duplicates.length > 1 && duplicates[0].id !== attempt.id) {
      await supabase.from('attempts').delete().eq('id', attempt.id);
      return res.status(409).json({
        code: 'ATTEMPT_LIMIT_REACHED',
        error: 'این آزمون فقط یک‌بار قابل شرکت است و شما قبلاً در آن شرکت کرده‌اید.'
      });
    }
  }

  return res.status(201).json({
    attempt,
    summary: { correctCount, totalQuestions: questions.length, earnedWeight, totalWeight }
  });
}));

app.get('/api/attempts', asyncRoute(async (req, res) => {
  if (!checkDb(res)) return;
  let query = supabase.from('attempts').select('*').order('created_at', { ascending: false });
  if (req.query.user_id) query = query.eq('user_id', req.query.user_id);
  if (req.query.test_id) query = query.eq('test_id', req.query.test_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ attempts: data || [] });
}));

app.use((error, _req, res, _next) => {
  console.error('API error:', error);
  if (res.headersSent) return;
  return res.status(500).json({ error: 'خطای پیش‌بینی‌نشده‌ای در سرور رخ داد. دوباره تلاش کنید.' });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
    console.log(supabase ? 'Supabase configuration detected.' : 'Warning: SUPABASE_URL / SUPABASE_KEY are missing.');
  });
}

export default app;
