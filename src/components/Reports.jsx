import React, { useMemo } from 'react';
import { BarChart3, Download, Eye, Lock, Repeat } from 'lucide-react';
import { exportAttemptsCsv, fa, faDate, isSingleAttempt, percentOf } from '../utils.js';
import { EmptyState } from './MyResults.jsx';

export default function Reports({ user, tests, attempts, onInspect }) {
  const reportTests = user.role === 'super_admin' ? tests : tests.filter((t) => t.creator_id === user.id);

  const perUser = useMemo(() => {
    const map = new Map();
    attempts.forEach((a) => {
      const key = `${a.user_id ?? a.username}_${a.test_id}`;
      const row = map.get(key) || { username: a.username, title: a.test_title, count: 0, best: a.score, max: a.max_score };
      row.count += 1;
      row.best = Math.max(row.best, a.score);
      map.set(key, row);
    });
    return [...map.values()];
  }, [attempts]);

  const analyses = useMemo(() => reportTests.map((test) => {
    const testAttempts = attempts.filter((a) => a.test_id === test.id);
    const questions = (test.questions || []).map((q, qi) => {
      const responses = testAttempts.map((a) => (a.details || []).find((d) => d.questionIndex === qi)).filter(Boolean);
      const correct = responses.filter((r) => r.isCorrect).length;
      return { qi, text: q.text, total: responses.length, correct, percent: responses.length ? Math.round((correct / responses.length) * 100) : 0 };
    });
    return { test, questions, count: testAttempts.length };
  }), [reportTests, attempts]);

  const uniqueUsers = new Set(attempts.map((a) => a.user_id ?? a.username)).size;
  const passRate = attempts.length ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100) : 0;
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + percentOf(a), 0) / attempts.length) : 0;

  return (
    <div className="stack">
      <div className="mini-metrics">
        <div><span>آزمون‌ها</span><b>{fa(reportTests.length)}</b></div>
        <div><span>شرکت‌کنندگان یکتا</span><b>{fa(uniqueUsers)}</b></div>
        <div><span>کل کارنامه‌ها</span><b>{fa(attempts.length)}</b></div>
        <div><span>نرخ قبولی</span><b>{fa(passRate)}٪</b></div>
        <div><span>میانگین درصد</span><b>{fa(avg)}٪</b></div>
      </div>

      <section className="panel">
        <h2 className="panel-heading">آزمون‌ها و شرکت‌کنندگان</h2>
        {reportTests.length === 0 ? <EmptyState title="آزمونی وجود ندارد" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>آزمون</th><th>طراح</th><th>نمره</th><th>سؤالات</th><th>سیاست شرکت</th><th>شرکت‌کنندگان</th><th>وضعیت</th></tr></thead>
              <tbody>
                {reportTests.map((t) => {
                  const list = attempts.filter((a) => a.test_id === t.id);
                  const unique = new Set(list.map((a) => a.user_id ?? a.username)).size;
                  const single = isSingleAttempt(t);
                  return (
                    <tr key={t.id}>
                      <td data-label="آزمون"><b>{t.title}</b></td>
                      <td data-label="طراح">{t.creator_username}</td>
                      <td data-label="نمره">قبولی {fa(t.pass_score)} از {fa(t.max_score)}</td>
                      <td data-label="سؤالات">{fa(t.questions?.length || 0)}</td>
                      <td data-label="سیاست شرکت">
                        <span className={`policy-badge ${single ? 'single' : 'multi'}`}>
                          {single ? <Lock size={13} /> : <Repeat size={13} />}{single ? 'فقط یک‌بار' : 'چندبار مجاز'}
                        </span>
                      </td>
                      <td data-label="شرکت‌کنندگان">{fa(unique)} نفر / {fa(list.length)} کارنامه</td>
                      <td data-label="وضعیت"><span className={`status-badge ${t.is_archived ? 'fail' : 'pass'}`}>{t.is_archived ? 'آرشیو' : 'فعال'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-heading">دفعات شرکت هر کاربر</h2>
        {perUser.length === 0 ? <EmptyState icon={BarChart3} title="هنوز نتیجه‌ای ثبت نشده است" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>کاربر</th><th>آزمون</th><th>دفعات شرکت</th><th>بالاترین نمره</th></tr></thead>
              <tbody>
                {perUser.map((r, i) => (
                  <tr key={i}>
                    <td data-label="کاربر"><b>{r.username}</b></td>
                    <td data-label="آزمون">{r.title}</td>
                    <td data-label="دفعات شرکت">{fa(r.count)} بار</td>
                    <td data-label="بالاترین نمره">{fa(r.best)} از {fa(r.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-heading">تحلیل سؤالات</h2>
        <p className="muted panel-sub">درصد پاسخ صحیح هر سؤال، بر اساس کارنامه‌های ثبت‌شده.</p>
        {analyses.filter((a) => a.count > 0).length === 0 ? <EmptyState icon={BarChart3} title="داده‌ای برای تحلیل نیست" text="پس از شرکت اولین کاربر، تحلیل‌ها اینجا نمایش داده می‌شود." /> : (
          <div className="analysis-list">
            {analyses.filter((a) => a.count > 0).map(({ test, questions, count }) => (
              <div key={test.id} className="analysis-block">
                <div className="analysis-title"><b>{test.title}</b><span className="muted">{fa(count)} کارنامه</span></div>
                {questions.map((q) => (
                  <div key={q.qi} className="analysis-row">
                    <span className="analysis-q">{fa(q.qi + 1)}. {q.text}</span>
                    <div className="analysis-bar">
                      <div className="progress"><span className={q.percent >= 70 ? 'good' : q.percent >= 40 ? 'mid' : 'low'} style={{ width: `${q.percent}%` }} /></div>
                      <b>{fa(q.percent)}٪</b>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-heading">ریز کارنامه‌ها</h2>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => exportAttemptsCsv(attempts)} disabled={!attempts.length}>
            <Download size={16} /> خروجی CSV
          </button>
        </div>
        {attempts.length === 0 ? <EmptyState title="هنوز نتیجه‌ای ثبت نشده است" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>کاربر</th><th>آزمون</th><th>نمره</th><th>وضعیت</th><th>زمان</th><th /></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td data-label="کاربر"><b>{a.username}</b></td>
                    <td data-label="آزمون">{a.test_title}</td>
                    <td data-label="نمره"><b>{fa(a.score)}</b> از {fa(a.max_score)}</td>
                    <td data-label="وضعیت"><span className={`status-badge ${a.passed ? 'pass' : 'fail'}`}>{a.passed ? 'قبول' : 'مردود'}</span></td>
                    <td data-label="زمان" className="muted">{faDate(a.created_at)}</td>
                    <td><button type="button" className="btn btn-soft btn-sm" onClick={() => onInspect(a)}><Eye size={15} /> پاسخ‌برگ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
