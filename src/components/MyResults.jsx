import React from 'react';
import { Eye, Inbox } from 'lucide-react';
import { fa, faDate } from '../utils.js';

export function EmptyState({ icon: Icon = Inbox, title, text }) {
  return (
    <div className="empty">
      <span><Icon size={28} /></span>
      <b>{title}</b>
      {text && <p>{text}</p>}
    </div>
  );
}

export default function MyResults({ attempts, onInspect }) {
  return (
    <section className="panel">
      <div className="section-head"><div><h2>کارنامه‌های من</h2><p className="muted">تاریخچه‌ی تمام آزمون‌هایی که داده‌اید.</p></div></div>
      {attempts.length === 0 ? (
        <EmptyState title="هنوز در آزمونی شرکت نکرده‌اید" text="از بخش «آزمون‌ها» یک آزمون را شروع کنید." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>آزمون</th><th>نمره</th><th>حد نصاب</th><th>وضعیت</th><th>تاریخ</th><th /></tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td data-label="آزمون"><b>{a.test_title}</b></td>
                  <td data-label="نمره"><b>{fa(a.score)}</b> از {fa(a.max_score)}</td>
                  <td data-label="حد نصاب">{fa(a.pass_score)}</td>
                  <td data-label="وضعیت"><span className={`status-badge ${a.passed ? 'pass' : 'fail'}`}>{a.passed ? 'قبول' : 'مردود'}</span></td>
                  <td data-label="تاریخ" className="muted">{faDate(a.created_at)}</td>
                  <td><button type="button" className="btn btn-soft btn-sm" onClick={() => onInspect(a)}><Eye size={15} /> بررسی</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
