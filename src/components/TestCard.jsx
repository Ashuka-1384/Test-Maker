import React from 'react';
import { ClipboardList, Pencil, Archive, Play, Repeat, Lock, Eye, HelpCircle, Target, User } from 'lucide-react';
import { fa, isSingleAttempt } from '../utils.js';

export default function TestCard({
  test, user, myAttempts, canEditFlag, onStart, onEdit, onArchive, onViewAttempt, onTogglePolicy
}) {
  const single = isSingleAttempt(test);
  const mine = myAttempts.filter((a) => a.test_id === test.id);
  const lastAttempt = mine[0];
  const blocked = single && mine.length > 0;
  const canManage = user.role === 'super_admin' || test.creator_id === user.id;

  return (
    <article className={`test-card ${blocked ? 'is-done' : ''}`}>
      <div className="test-card-top">
        <span className="test-icon"><ClipboardList size={22} /></span>
        <span className={`policy-badge ${single ? 'single' : 'multi'}`} title={single ? 'هر کاربر فقط یک‌بار می‌تواند شرکت کند' : 'شرکت چندباره مجاز است'}>
          {single ? <Lock size={13} /> : <Repeat size={13} />}
          {single ? 'فقط یک‌بار' : 'چندبار مجاز'}
        </span>
      </div>

      <h3>{test.title}</h3>
      <p className="test-author"><User size={14} /> {test.creator_username}</p>

      <div className="test-stats">
        <span><HelpCircle size={15} /><b>{fa(test.questions?.length || 0)}</b> سؤال</span>
        <span><Target size={15} />قبولی <b>{fa(test.pass_score)}</b> از <b>{fa(test.max_score)}</b></span>
      </div>

      {mine.length > 0 && (
        <div className="test-mine">
          شما <b>{fa(mine.length)}</b> بار شرکت کرده‌اید · آخرین نمره: <b>{fa(lastAttempt.score)}</b> از {fa(lastAttempt.max_score)}
        </div>
      )}

      <div className="test-card-actions">
        {blocked ? (
          <>
            <button type="button" className="btn btn-soft btn-grow" onClick={() => onViewAttempt(lastAttempt)}>
              <Eye size={17} /> مشاهده کارنامه
            </button>
            <button type="button" className="btn btn-disabled" disabled title="این آزمون فقط یک‌بار قابل شرکت است">
              <Lock size={16} /> تکمیل شده
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-grow" onClick={() => onStart(test)}>
            <Play size={16} /> {mine.length > 0 ? 'شرکت مجدد' : 'شروع آزمون'}
          </button>
        )}
      </div>

      {canManage && (
        <div className="test-manage">
          <button type="button" className="chip-btn" onClick={() => onTogglePolicy(test)}
            title="تغییر سیاست تعداد دفعات شرکت">
            {single ? <Repeat size={14} /> : <Lock size={14} />}
            {single ? 'اجازه‌ی چندبار شرکت' : 'محدود به یک‌بار'}
          </button>
          {canEditFlag && (
            <button type="button" className="chip-btn" onClick={() => onEdit(test)}><Pencil size={14} /> ویرایش</button>
          )}
          <button type="button" className="chip-btn danger" onClick={() => onArchive(test)}><Archive size={14} /> آرشیو</button>
        </div>
      )}
    </article>
  );
}
