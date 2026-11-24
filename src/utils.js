export const ROLE_LABELS = {
  super_admin: 'ادمین اصلی',
  designer: 'طراح آزمون',
  user: 'کاربر'
};

export const QUESTION_TYPE_LABELS = {
  single_choice: 'تک‌پاسخی',
  multiple_choice: 'چندپاسخی',
  true_false: 'درست / نادرست'
};

export const fa = (value) => Number(value ?? 0).toLocaleString('fa-IR');
export const faDate = (value) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

export const percentOf = (attempt) =>
  Number(attempt.max_score) > 0 ? (Number(attempt.score) / Number(attempt.max_score)) * 100 : 0;

// آزمونی که فقط یک‌بار قابل شرکت است؟ (مقدار undefined یعنی دیتابیس قدیمی = چندباره)
export const isSingleAttempt = (test) => test?.allow_multiple_attempts === false;

export function isQuestionAnswered(question, answer) {
  if ((question?.type || 'single_choice') === 'multiple_choice') {
    return Array.isArray(answer) && answer.length >= 2;
  }
  const selected = Number(answer);
  return answer !== null && answer !== undefined && answer !== '' &&
    Number.isInteger(selected) && selected >= 0 && selected < (question?.options?.length || 4);
}

export function exportAttemptsCsv(attempts) {
  const labels = ['نام کاربر', 'عنوان آزمون', 'نمره', 'نمره کل', 'حد نصاب قبولی', 'وضعیت قبولی', 'زمان ثبت'];
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [labels, ...attempts.map((a) => [
    a.username, a.test_title, a.score, a.max_score, a.pass_score,
    a.passed ? 'قبول' : 'مردود', new Date(a.created_at).toLocaleString('fa-IR')
  ])];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `test-maker-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
