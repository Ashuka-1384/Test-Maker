import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Lock, Plus, Repeat, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useUI } from './ui.jsx';
import { fa } from '../utils.js';

const blankQuestion = () => ({
  type: 'single_choice', text: '', options: ['', '', '', ''], correctIndex: null,
  correctIndices: [], weight: 1, explanation: ''
});

function normalizeQuestion(question) {
  const raw = question.correctIndex;
  const hasIndex = raw !== null && raw !== undefined && String(raw).trim() !== '' && Number.isInteger(Number(raw));
  return {
    type: question.type || 'single_choice',
    text: question.text || '',
    options: Array.isArray(question.options) ? [...question.options] : ['', '', '', ''],
    correctIndex: hasIndex ? Number(raw) : null,
    correctIndices: Array.isArray(question.correctIndices) ? question.correctIndices.map(Number) : [],
    weight: question.weight ?? 1,
    explanation: question.explanation || ''
  };
}

export default function TestCreatorForm({ user, initialTest, onSaved, onCancel }) {
  const { toast } = useUI();
  const [title, setTitle] = useState(initialTest?.title || '');
  const [maxScore, setMaxScore] = useState(initialTest?.max_score || 20);
  const [passScore, setPassScore] = useState(initialTest?.pass_score ?? 10);
  const [allowMultiple, setAllowMultiple] = useState(initialTest ? initialTest.allow_multiple_attempts !== false : true);
  const [questions, setQuestions] = useState(() =>
    initialTest?.questions?.length ? initialTest.questions.map(normalizeQuestion) : [blankQuestion()]);
  const [saving, setSaving] = useState(false);

  const patch = (index, changes) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...changes } : q)));

  function changeType(index, type) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== index) return q;
      let options = q.options;
      if (type === 'true_false') options = ['درست', 'نادرست'];
      else if (q.type === 'true_false') options = ['', '', '', ''];
      return { ...q, type, options, correctIndex: null, correctIndices: [] };
    }));
  }

  function toggleCorrect(qi, oi) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const current = q.correctIndices || [];
      const next = current.includes(oi) ? current.filter((v) => v !== oi) : [...current, oi].sort((a, b) => a - b);
      return { ...q, correctIndices: next };
    }));
  }

  function setOption(qi, oi, value) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const options = [...q.options];
      options[oi] = value;
      return { ...q, options };
    }));
  }

  function validate() {
    if (!title.trim()) return 'عنوان آزمون را وارد کنید.';
    const pass = Number(passScore);
    if (!Number.isFinite(pass) || pass < 0 || pass > Number(maxScore)) return 'نمره قبولی باید بین صفر و سقف نمره آزمون باشد.';
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const n = i + 1;
      const expected = q.type === 'true_false' ? 2 : 4;
      if (!q.text.trim()) return `متن سؤال ${fa(n)} را وارد کنید.`;
      if (q.options.length !== expected || q.options.some((o) => !o.trim())) return `همه‌ی گزینه‌های سؤال ${fa(n)} باید تکمیل شوند.`;
      if (q.type === 'multiple_choice') {
        if ((q.correctIndices || []).length < 2) return `برای سؤال چندپاسخی ${fa(n)} حداقل دو پاسخ صحیح انتخاب کنید.`;
      } else if (q.correctIndex === null || q.correctIndex < 0 || q.correctIndex >= expected) {
        return `پاسخ صحیح سؤال ${fa(n)} را انتخاب کنید.`;
      }
      const w = Number(q.weight);
      if (!Number.isFinite(w) || w <= 0 || w > 100) return `ضریب سؤال ${fa(n)} باید بین ۰ تا ۱۰۰ باشد.`;
    }
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = validate();
    if (problem) return toast(problem, 'error');

    setSaving(true);
    try {
      const isEdit = Boolean(initialTest?.id);
      const data = await api(isEdit ? `/api/tests/${initialTest.id}` : '/api/tests', {
        method: isEdit ? 'PUT' : 'POST',
        body: {
          title: title.trim(),
          max_score: Number(maxScore),
          pass_score: Number(passScore),
          allow_multiple_attempts: allowMultiple,
          creator_id: user.id,
          creator_username: user.username,
          questions: questions.map((q) => ({
            ...q,
            text: q.text.trim(),
            options: q.options.map((o) => o.trim()),
            correctIndex: q.type === 'multiple_choice' ? null : Number(q.correctIndex),
            correctIndices: q.type === 'multiple_choice' ? q.correctIndices.map(Number) : [],
            weight: Number(q.weight),
            explanation: q.explanation.trim()
          }))
        }
      });
      toast(isEdit ? 'تغییرات آزمون ذخیره شد.' : 'آزمون با موفقیت منتشر شد.', 'success');
      onSaved(data.test, isEdit);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="creator" onSubmit={handleSubmit}>
      <div className="section-head">
        <div>
          <h2>{initialTest ? 'ویرایش آزمون' : 'طراحی آزمون جدید'}</h2>
          <p className="muted">اطلاعات کلی، سیاست شرکت و سؤال‌ها را مرحله به مرحله تنظیم کنید.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}><ArrowRight size={16} /> بازگشت</button>
      </div>

      <section className="panel">
        <h3 className="panel-title"><span className="step">۱</span> اطلاعات کلی</h3>
        <div className="grid-3">
          <div className="field">
            <label>نام آزمون</label>
            <input type="text" placeholder="مثلاً: آزمون مبانی برنامه‌نویسی" value={title}
              onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </div>
          <div className="field">
            <label>مقیاس نمره‌دهی</label>
            <select value={maxScore} onChange={(e) => {
              const v = Number(e.target.value);
              setMaxScore(v);
              setPassScore(v === 20 ? 10 : 50);
            }}>
              <option value={20}>از ۲۰ نمره</option>
              <option value={100}>از ۱۰۰ نمره</option>
            </select>
          </div>
          <div className="field">
            <label>حداقل نمره قبولی (از {fa(maxScore)})</label>
            <input type="number" step="0.5" min="0" max={maxScore} value={passScore}
              onChange={(e) => setPassScore(e.target.value)} required />
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title"><span className="step">۲</span> تعداد دفعات شرکت</h3>
        <p className="muted panel-sub">مشخص کنید هر شرکت‌کننده چند بار می‌تواند در این آزمون شرکت کند. این محدودیت در سمت سرور هم اعمال می‌شود.</p>
        <div className="policy-options" role="radiogroup" aria-label="تعداد دفعات شرکت">
          <button type="button" role="radio" aria-checked={!allowMultiple} className={`policy-option ${!allowMultiple ? 'active' : ''}`}
            onClick={() => setAllowMultiple(false)}>
            <span className="policy-icon"><Lock size={22} /></span>
            <span><b>فقط یک‌بار</b><small>هر کاربر فقط یک شانس دارد؛ پس از ثبت، فقط کارنامه را می‌بیند.</small></span>
          </button>
          <button type="button" role="radio" aria-checked={allowMultiple} className={`policy-option ${allowMultiple ? 'active' : ''}`}
            onClick={() => setAllowMultiple(true)}>
            <span className="policy-icon"><Repeat size={22} /></span>
            <span><b>چندبار مجاز</b><small>کاربران می‌توانند هر چند بار بخواهند شرکت کنند؛ برای هر بار کارنامه ثبت می‌شود.</small></span>
          </button>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title"><span className="step">۳</span> سؤال‌ها <span className="count-pill">{fa(questions.length)}</span></h3>

        {questions.map((q, qi) => {
          const isMultiple = q.type === 'multiple_choice';
          return (
            <div key={qi} className="q-editor">
              <div className="q-editor-head">
                <span className="q-number">{fa(qi + 1)}</span>
                <div className="q-editor-tools">
                  <select aria-label="نوع سؤال" value={q.type} onChange={(e) => changeType(qi, e.target.value)}>
                    <option value="single_choice">تک‌پاسخی</option>
                    <option value="multiple_choice">چندپاسخی</option>
                    <option value="true_false">درست / نادرست</option>
                  </select>
                  <label className="weight-field">ضریب
                    <input type="number" min="0.1" max="100" step="0.1" value={q.weight}
                      onChange={(e) => patch(qi, { weight: e.target.value })} />
                  </label>
                  {questions.length > 1 && (
                    <button type="button" className="icon-btn danger" aria-label="حذف سؤال"
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}><Trash2 size={17} /></button>
                  )}
                </div>
              </div>

              <div className="field">
                <textarea rows="2" placeholder="صورت سؤال را بنویسید..." value={q.text}
                  onChange={(e) => patch(qi, { text: e.target.value })} required />
              </div>

              <p className="hint">{isMultiple ? 'همه‌ی گزینه‌های صحیح را تیک بزنید (حداقل دو گزینه).' : 'گزینه‌ی صحیح را انتخاب کنید.'}</p>
              {q.options.map((opt, oi) => {
                const isCorrect = isMultiple ? (q.correctIndices || []).includes(oi) : q.correctIndex === oi;
                return (
                  <div key={oi} className={`option-row ${isCorrect ? 'is-correct' : ''}`}>
                    <label className="correct-toggle" title="علامت‌گذاری به عنوان پاسخ صحیح">
                      <input type={isMultiple ? 'checkbox' : 'radio'} name={`correct_${qi}`} checked={isCorrect}
                        onChange={() => (isMultiple ? toggleCorrect(qi, oi) : patch(qi, { correctIndex: oi }))} />
                      <span>{isCorrect ? '✓' : fa(oi + 1)}</span>
                    </label>
                    <input type="text" placeholder={`گزینه ${fa(oi + 1)}`} value={opt}
                      onChange={(e) => setOption(qi, oi, e.target.value)} readOnly={q.type === 'true_false'} required />
                  </div>
                );
              })}

              <div className="field">
                <label>توضیح پاسخ صحیح <span className="optional">اختیاری؛ در کارنامه نمایش داده می‌شود</span></label>
                <textarea rows="2" placeholder="دلیل درست بودن پاسخ را بنویسید..." value={q.explanation}
                  onChange={(e) => patch(qi, { explanation: e.target.value })} />
              </div>
            </div>
          );
        })}

        <button type="button" className="btn btn-soft btn-block add-question" onClick={() => setQuestions((p) => [...p, blankQuestion()])}>
          <Plus size={18} /> افزودن سؤال
        </button>
      </section>

      <div className="creator-footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>انصراف</button>
        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? <Loader2 size={19} className="spin" /> : <CheckCircle2 size={19} />}
          {saving ? 'در حال ذخیره...' : initialTest ? 'ذخیره تغییرات' : 'ذخیره و انتشار آزمون'}
        </button>
      </div>
    </form>
  );
}
