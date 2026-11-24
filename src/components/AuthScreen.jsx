import React, { useState } from 'react';
import { BookOpen, ClipboardList, BarChart2, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import PWAInstallPrompt from '../PWAInstallPrompt.jsx';
import { api } from '../api.js';

export default function AuthScreen({ dbStatus, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api(mode === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        body: { username, password }
      });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-blob blob-a" aria-hidden="true" />
      <div className="auth-blob blob-b" aria-hidden="true" />

      <div className="auth-shell">
        <aside className="auth-aside">
          <div className="auth-logo"><span className="logo-mark"><BookOpen size={24} /></span><b>Test Maker</b></div>
          <div className="auth-aside-copy">
            <span className="eyebrow">سامانه آزمون‌ساز آنلاین</span>
            <h2>آزمون بساز،<br /><em>دقیق بسنج</em>،<br />رشد را ببین.</h2>
            <p>طراحی آزمون در چند دقیقه، تصحیح خودکار و کارنامه‌ی کامل برای هر شرکت‌کننده.</p>
          </div>
          <ul className="auth-points">
            <li><span><ClipboardList size={18} /></span><div><b>سه نوع سؤال</b><small>تک‌پاسخی، چندپاسخی، درست/نادرست</small></div></li>
            <li><span><ShieldCheck size={18} /></span><div><b>کنترل تعداد دفعات شرکت</b><small>آزمون یک‌بار یا چندباره</small></div></li>
            <li><span><BarChart2 size={18} /></span><div><b>تحلیل نتایج</b><small>درصد پاسخ صحیح هر سؤال و خروجی CSV</small></div></li>
          </ul>
        </aside>

        <section className="auth-panel">
          <div className="auth-logo auth-logo-mobile"><span className="logo-mark"><BookOpen size={22} /></span><b>Test Maker</b></div>
          <h1>{mode === 'login' ? 'خوش برگشتی 👋' : 'ساخت حساب جدید'}</h1>
          <p className="muted">
            {mode === 'login' ? 'برای ادامه وارد حساب کاربری‌ات شو.' : 'در کمتر از یک دقیقه عضو شو و اولین آزمونت را بده.'}
          </p>

          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setError(''); }}>ورود</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''}
              onClick={() => { setMode('register'); setError(''); }}>ثبت‌نام</button>
          </div>

          {dbStatus.checked && !dbStatus.ok && (
            <div className="alert alert-error"><b>وضعیت دیتابیس:</b> {dbStatus.message}</div>
          )}
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label htmlFor="username">نام کاربری</label>
              <input id="username" type="text" autoComplete="username" placeholder="مثلاً: ali_ahmadi" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="password">رمز عبور</label>
              <div className="input-with-action">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="حداقل ۴ نویسه" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="input-action" aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
              {loading && <Loader2 size={18} className="spin" />}
              {loading ? 'در حال پردازش...' : mode === 'login' ? 'ورود به حساب' : 'ساخت حساب کاربری'}
            </button>
          </form>
          <div className="auth-install"><PWAInstallPrompt /></div>
        </section>
      </div>
    </div>
  );
}
