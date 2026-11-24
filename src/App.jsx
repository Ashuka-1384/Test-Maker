import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, BarChart3, CheckCircle2, ClipboardList, Loader2, PlusCircle, Search, Sparkles, Target, TrendingUp, Users, WifiOff
} from 'lucide-react';
import { api } from './api.js';
import { fa, isSingleAttempt, percentOf } from './utils.js';
import { useUI } from './components/ui.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Header from './components/Header.jsx';
import TestCard from './components/TestCard.jsx';
import ExamRunner from './components/ExamRunner.jsx';
import AttemptModal from './components/AttemptModal.jsx';
import TestCreatorForm from './components/TestCreatorForm.jsx';
import MyResults, { EmptyState } from './components/MyResults.jsx';
import Reports from './components/Reports.jsx';
import UsersAdmin from './components/UsersAdmin.jsx';

function readStoredUser() {
  try {
    const saved = localStorage.getItem('tm_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem('tm_user');
    return null;
  }
}

function initialTheme() {
  try {
    const saved = localStorage.getItem('tm_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const { toast, confirm } = useUI();
  const [user, setUser] = useState(readStoredUser);
  const [theme, setTheme] = useState(initialTheme);
  const [dbStatus, setDbStatus] = useState({ checked: false, ok: true, message: '' });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const [tab, setTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [editingTest, setEditingTest] = useState(null);
  const [takingTest, setTakingTest] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d0e1f' : '#4f46e5');
    try { localStorage.setItem('tm_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    api('/api/health')
      .then((data) => setDbStatus({ checked: true, ok: true, message: data.message }))
      .catch((err) => setDbStatus({
        checked: true, ok: false,
        message: err.status ? err.message : 'سرور بک‌اند در دسترس نیست. برای اجرای محلی دستور npm run dev را اجرا کنید.'
      }));
  }, []);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [testsData, attemptsData] = await Promise.all([
        api('/api/tests?include_archived=true'),
        api('/api/attempts')
      ]);
      setTests(testsData.tests || []);
      setAttempts(attemptsData.attempts || []);
      if (user.role === 'super_admin') {
        const usersData = await api('/api/users');
        setAllUsers(usersData.users || []);
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleAuthenticated(nextUser) {
    setUser(nextUser);
    localStorage.setItem('tm_user', JSON.stringify(nextUser));
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem('tm_user');
    setTakingTest(null);
    setSelectedAttempt(null);
    setEditingTest(null);
    setTab('tests');
  }

  async function handleChangeRole(targetId, role) {
    try {
      const data = await api(`/api/users/${targetId}/role`, { method: 'POST', body: { role } });
      setAllUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, role: data.user.role } : u)));
      toast('نقش کاربر به‌روزرسانی شد.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleArchive(test) {
    const ok = await confirm({
      title: 'آرشیو آزمون', danger: true, confirmText: 'آرشیو شود',
      message: `«${test.title}» از فهرست آزمون‌های فعال کنار می‌رود؛ کارنامه‌های قبلی حفظ می‌شوند.`
    });
    if (!ok) return;
    try {
      await api(`/api/tests/${test.id}`, { method: 'DELETE' });
      setTests((prev) => prev.map((t) => (t.id === test.id ? { ...t, is_archived: true } : t)));
      toast('آزمون آرشیو شد.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleTogglePolicy(test) {
    const toSingle = !isSingleAttempt(test);
    const ok = await confirm({
      title: toSingle ? 'محدود کردن به یک‌بار شرکت' : 'اجازه‌ی شرکت چندباره',
      message: toSingle
        ? 'از این پس هر کاربر فقط یک‌بار می‌تواند در این آزمون شرکت کند. کاربرانی که قبلاً شرکت کرده‌اند دیگر نمی‌توانند دوباره شرکت کنند.'
        : 'از این پس کاربران می‌توانند چندین بار در این آزمون شرکت کنند.',
      confirmText: 'تغییر بده'
    });
    if (!ok) return;
    try {
      const data = await api(`/api/tests/${test.id}/attempt-policy`, {
        method: 'PATCH', body: { user_id: user.id, allow_multiple_attempts: !toSingle }
      });
      setTests((prev) => prev.map((t) => (t.id === test.id ? data.test : t)));
      toast(toSingle ? 'آزمون روی «فقط یک‌بار» تنظیم شد.' : 'شرکت چندباره مجاز شد.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function handleSaved(savedTest, wasEdit) {
    setTests((prev) => (wasEdit ? prev.map((t) => (t.id === savedTest.id ? savedTest : t)) : [savedTest, ...prev]));
    setEditingTest(null);
    setTab('tests');
  }

  const canCreate = user?.role === 'super_admin' || user?.role === 'designer';
  const activeTests = useMemo(() => tests.filter((t) => !t.is_archived), [tests]);
  const myAttempts = useMemo(() => attempts.filter((a) => a.user_id === user?.id), [attempts, user]);
  const testsWithAttempts = useMemo(() => new Set(attempts.map((a) => a.test_id)), [attempts]);

  const visibleTests = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fa');
    return activeTests.filter((t) => {
      if (q && !`${t.title} ${t.creator_username}`.toLocaleLowerCase('fa').includes(q)) return false;
      const done = myAttempts.some((a) => a.test_id === t.id);
      if (filter === 'todo') return !(isSingleAttempt(t) && done);
      if (filter === 'done') return done;
      return true;
    });
  }, [activeTests, search, filter, myAttempts]);

  const reportAttempts = useMemo(() => {
    if (user?.role === 'super_admin') return attempts;
    const ownIds = new Set(tests.filter((t) => t.creator_id === user?.id).map((t) => t.id));
    return attempts.filter((a) => ownIds.has(a.test_id));
  }, [attempts, tests, user]);

  if (!user) return <AuthScreen dbStatus={dbStatus} onAuthenticated={handleAuthenticated} />;

  const avg = myAttempts.length ? Math.round(myAttempts.reduce((s, a) => s + percentOf(a), 0) / myAttempts.length) : null;
  const best = myAttempts.length ? Math.round(Math.max(...myAttempts.map(percentOf))) : null;
  const passRate = myAttempts.length ? Math.round((myAttempts.filter((a) => a.passed).length / myAttempts.length) * 100) : null;
  const dash = (v) => (v === null ? '—' : `${fa(v)}٪`);

  const tabs = [
    { id: 'tests', label: 'آزمون‌ها', icon: ClipboardList, badge: activeTests.length },
    { id: 'my_results', label: 'کارنامه‌های من', icon: Award, badge: myAttempts.length },
    canCreate && { id: 'create_test', label: 'ساخت آزمون', icon: PlusCircle },
    canCreate && { id: 'reports', label: user.role === 'super_admin' ? 'گزارش جامع' : 'نتایج آزمون‌های من', icon: BarChart3 },
    user.role === 'super_admin' && { id: 'admin_users', label: 'کاربران', icon: Users }
  ].filter(Boolean);

  const openTab = (id) => {
    if (id === 'create_test') setEditingTest(null);
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <Header user={user} theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} onLogout={handleLogout} />

      <main className="page">
        {!isOnline && <div className="alert alert-warning"><WifiOff size={18} /> اتصال اینترنت قطع است؛ دریافت آزمون‌ها و ثبت پاسخ‌ها تا اتصال مجدد ممکن نیست.</div>}
        {dbStatus.checked && !dbStatus.ok && <div className="alert alert-error"><b>خطای اتصال:</b> {dbStatus.message}</div>}

        {takingTest ? (
          <ExamRunner
            key={takingTest.id}
            test={takingTest}
            user={user}
            onExit={() => setTakingTest(null)}
            onLimitReached={() => { setTakingTest(null); fetchAll(); }}
            onSubmitted={(attempt) => {
              setAttempts((prev) => [attempt, ...prev]);
              setTakingTest(null);
              setSelectedAttempt(attempt);
            }}
          />
        ) : (
          <>
            <section className="hero">
              <div className="hero-glow" aria-hidden="true" />
              <div className="hero-text">
                <span className="eyebrow"><Sparkles size={14} /> {canCreate ? 'پنل طراح' : 'پنل شرکت‌کننده'}</span>
                <h1>سلام {user.username} 👋</h1>
                <p>{canCreate ? 'آزمون جدید بساز، نتایج را تحلیل کن و تعداد دفعات شرکت را خودت کنترل کن.' : 'آزمون مناسب را انتخاب کن و پیشرفتت را قدم‌به‌قدم دنبال کن.'}</p>
                {canCreate && <button type="button" className="btn btn-light" onClick={() => openTab('create_test')}><PlusCircle size={18} /> طراحی آزمون جدید</button>}
              </div>
              <div className="hero-stats">
                <div><TrendingUp size={18} /><b>{dash(avg)}</b><span>میانگین</span></div>
                <div><Target size={18} /><b>{dash(best)}</b><span>بهترین</span></div>
                <div><CheckCircle2 size={18} /><b>{dash(passRate)}</b><span>نرخ قبولی</span></div>
              </div>
            </section>

            <nav className="tabs" aria-label="بخش‌های برنامه">
              {tabs.map(({ id, label, icon: Icon, badge }) => (
                <button key={id} type="button" className={`tab ${tab === id ? 'active' : ''}`} onClick={() => openTab(id)}>
                  <Icon size={19} /><span>{label}</span>
                  {badge !== undefined && <em>{fa(badge)}</em>}
                </button>
              ))}
            </nav>

            {loading && <div className="loading-line"><Loader2 size={16} className="spin" /> در حال دریافت اطلاعات...</div>}

            {tab === 'tests' && (
              <section>
                <div className="section-head">
                  <div><h2>آزمون‌های در دسترس</h2><p className="muted">یک آزمون انتخاب کن و دانسته‌هایت را بسنج.</p></div>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی آزمون یا طراح..." aria-label="جست‌وجو" />
                    </div>
                    <div className="segmented small" role="tablist">
                      {[['all', 'همه'], ['todo', 'قابل شرکت'], ['done', 'داده‌شده']].map(([id, label]) => (
                        <button key={id} type="button" className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {activeTests.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="هنوز آزمونی منتشر نشده است" text={canCreate ? 'اولین آزمون را همین حالا بسازید.' : 'کمی بعد دوباره سر بزنید.'} />
                ) : visibleTests.length === 0 ? (
                  <EmptyState icon={Search} title="آزمونی پیدا نشد" text="عبارت جست‌وجو یا فیلتر را تغییر دهید." />
                ) : (
                  <div className="cards">
                    {visibleTests.map((t) => (
                      <TestCard
                        key={t.id} test={t} user={user} myAttempts={myAttempts}
                        canEditFlag={!testsWithAttempts.has(t.id)}
                        onStart={setTakingTest}
                        onEdit={(test) => { setEditingTest(test); setTab('create_test'); }}
                        onArchive={handleArchive}
                        onViewAttempt={setSelectedAttempt}
                        onTogglePolicy={handleTogglePolicy}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === 'my_results' && <MyResults attempts={myAttempts} onInspect={setSelectedAttempt} />}

            {tab === 'create_test' && canCreate && (
              <TestCreatorForm
                key={editingTest?.id || 'new-test'} user={user} initialTest={editingTest}
                onSaved={handleSaved} onCancel={() => { setEditingTest(null); setTab('tests'); }}
              />
            )}

            {tab === 'reports' && canCreate && (
              <Reports user={user} tests={tests} attempts={reportAttempts} onInspect={setSelectedAttempt} />
            )}

            {tab === 'admin_users' && user.role === 'super_admin' && (
              <UsersAdmin users={allUsers} tests={tests} attempts={attempts} onChangeRole={handleChangeRole} />
            )}
          </>
        )}
      </main>

      {selectedAttempt && <AttemptModal attempt={selectedAttempt} onClose={() => setSelectedAttempt(null)} />}
      <footer className="footer">Test Maker · سنجش دقیق‌تر، مسیر روشن‌تر · {new Date().toLocaleDateString('fa-IR', { year: 'numeric' })}</footer>
    </div>
  );
}
