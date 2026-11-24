import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Lock, Repeat, Save } from 'lucide-react';
import { api } from '../api.js';
import { useUI } from './ui.jsx';
import { QUESTION_TYPE_LABELS, fa, isQuestionAnswered, isSingleAttempt } from '../utils.js';

export default function ExamRunner({ test, user, onExit, onSubmitted, onLimitReached }) {
  const { toast, confirm } = useUI();
  const draftKey = `tm_answers_${user.id}_${test.id}`;
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const single = isSingleAttempt(test);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      /* ذخیره‌ی پیش‌نویس اختیاری است */
    }
  }, [answers, draftKey]);

  const answeredCount = useMemo(
    () => test.questions.filter((q, i) => isQuestionAnswered(q, answers[i])).length,
    [test, answers]
  );
  const progress = test.questions.length ? (answeredCount / test.questions.length) * 100 : 0;

  function select(questionIndex, optionIndex, isMultiple) {
    setAnswers((prev) => {
      if (!isMultiple) return { ...prev, [questionIndex]: optionIndex };
      const current = Array.isArray(prev[questionIndex]) ? prev[questionIndex] : [];
      const next = current.includes(optionIndex)
        ? current.filter((v) => v !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b);
      return { ...prev, [questionIndex]: next };
    });
  }

  async function submit() {
    if (submitting) return;
    const unanswered = test.questions.length - answeredCount;
    const message = [
      unanswered > 0 ? `${fa(unanswered)} سؤال بدون پاسخ مانده است.` : 'همه‌ی سؤال‌ها پاسخ داده شده‌اند.',
      single ? 'این آزمون فقط یک‌بار قابل شرکت است و پس از ثبت، امکان تلاش دوباره وجود ندارد.' : 'پاسخ‌ها ثبت و تصحیح می‌شوند.'
    ].join(' ');
    const ok = await confirm({
      title: 'پایان آزمون؟', message, confirmText: 'ثبت نهایی', cancelText: 'ادامه‌ی پاسخ‌گویی', danger: single && unanswered > 0
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const data = await api('/api/attempts', {
        method: 'POST',
        body: { test_id: test.id, user_id: user.id, username: user.username, answers }
      });
      localStorage.removeItem(draftKey);
      onSubmitted(data.attempt);
    } catch (err) {
      if (err.code === 'ATTEMPT_LIMIT_REACHED') {
        localStorage.removeItem(draftKey);
        toast(err.message, 'error');
        onLimitReached();
      } else {
        toast(err.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function exit() {
    const ok = await confirm({
      title: 'خروج از آزمون', message: 'پاسخ‌های شما روی این دستگاه ذخیره می‌ماند و می‌توانید بعداً ادامه دهید.',
      confirmText: 'خروج', cancelText: 'ماندن'
    });
    if (ok) onExit();
  }

  return (
    <div className="exam">
      <div className="exam-sticky">
        <div className="exam-bar">
          <button type="button" className="icon-btn" onClick={exit} aria-label="خروج از آزمون"><ArrowRight size={20} /></button>
          <div className="exam-bar-title">
            <b>{test.title}</b>
            <small>{fa(answeredCount)} از {fa(test.questions.length)} پاسخ داده شده</small>
          </div>
          <span className="autosave"><Save size={14} /> ذخیره خودکار</span>
        </div>
        <div className="progress"><span style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="exam-body">
        <div className={`policy-banner ${single ? 'single' : 'multi'}`}>
          {single ? <Lock size={18} /> : <Repeat size={18} />}
          <span>
            {single
              ? 'این آزمون فقط یک‌بار قابل شرکت است. قبل از ثبت نهایی، پاسخ‌ها را مرور کنید.'
              : 'می‌توانید در این آزمون چندین بار شرکت کنید؛ هر بار یک کارنامه‌ی جداگانه ثبت می‌شود.'}
          </span>
        </div>

        <div className="exam-nav" aria-label="پیمایش سؤال‌ها">
          {test.questions.map((q, i) => (
            <a key={i} href={`#q-${i}`} className={isQuestionAnswered(q, answers[i]) ? 'done' : ''}
              onClick={(e) => { e.preventDefault(); document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
              {fa(i + 1)}
            </a>
          ))}
        </div>

        {test.questions.map((q, qi) => {
          const isMultiple = (q.type || 'single_choice') === 'multiple_choice';
          const selected = Array.isArray(answers[qi]) ? answers[qi] : [];
          return (
            <section key={qi} id={`q-${qi}`} className="question-card">
              <header>
                <span className="q-number">{fa(qi + 1)}</span>
                <span className="type-badge">{QUESTION_TYPE_LABELS[q.type || 'single_choice']}</span>
              </header>
              <p className="q-text">{q.text}</p>
              {isMultiple && <p className="hint">می‌توانید بیش از یک گزینه را انتخاب کنید (حداقل دو گزینه).</p>}
              <div className="options" role={isMultiple ? 'group' : 'radiogroup'}>
                {q.options.map((opt, oi) => {
                  const isSelected = isMultiple ? selected.includes(oi) : answers[qi] === oi;
                  return (
                    <button key={oi} type="button" role={isMultiple ? 'checkbox' : 'radio'} aria-checked={isSelected}
                      className={`option ${isSelected ? 'selected' : ''} ${isMultiple ? 'is-check' : ''}`}
                      onClick={() => select(qi, oi, isMultiple)}>
                      <span className="option-mark">{isSelected ? '✓' : fa(oi + 1)}</span>
                      <span className="option-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <button type="button" className="btn btn-success btn-lg btn-block" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 size={20} className="spin" /> : <CheckCircle2 size={20} />}
          {submitting ? 'در حال ثبت و تصحیح...' : 'پایان آزمون و مشاهده کارنامه'}
        </button>
      </div>
    </div>
  );
}
