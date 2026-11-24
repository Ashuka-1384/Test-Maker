import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { ROLE_LABELS, fa } from '../utils.js';

export default function UsersAdmin({ users, tests, attempts, onChangeRole }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>مدیریت کاربران و طراحان</h2>
          <p className="muted">کاربران را به «طراح آزمون» ارتقا دهید یا نقش‌شان را برگردانید.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>شناسه</th><th>نام کاربری</th><th>نقش</th><th>آزمون‌های ساخته‌شده</th><th>دفعات شرکت</th><th>عملیات</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const created = tests.filter((t) => t.creator_id === u.id);
              const taken = attempts.filter((a) => a.user_id === u.id).length;
              return (
                <tr key={u.id}>
                  <td data-label="شناسه" className="muted">#{fa(u.id)}</td>
                  <td data-label="نام کاربری"><b>{u.username}</b></td>
                  <td data-label="نقش"><span className={`role-pill role-${u.role}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td data-label="آزمون‌های ساخته‌شده">
                    {created.length === 0 ? <span className="muted">—</span>
                      : <span><b>{fa(created.length)}</b> <span className="muted">· {created.map((c) => c.title).join('، ')}</span></span>}
                  </td>
                  <td data-label="دفعات شرکت">{fa(taken)}</td>
                  <td>
                    {u.role === 'super_admin' ? <span className="muted">ادمین اصلی سیستم</span>
                      : u.role === 'user' ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => onChangeRole(u.id, 'designer')}><ShieldCheck size={15} /> ارتقا به طراح</button>
                      ) : (
                        <button type="button" className="btn btn-soft btn-sm" onClick={() => onChangeRole(u.id, 'user')}><UserCheck size={15} /> تغییر به کاربر</button>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
