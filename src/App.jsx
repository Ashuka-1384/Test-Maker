import React, { useState, useEffect } from 'react';
import PWAInstallPrompt from './PWAInstallPrompt.jsx';
import {
  BookOpen,
  PlusCircle,
  Users,
  BarChart2,
  CheckCircle,
  XCircle,
  LogOut,
  Award,
  Eye,
  Trash2,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Download
} from 'lucide-react';

const ROLE_LABELS = {
  super_admin: 'ادمین اصلی',
  designer: 'طراح آزمون',
  user: 'کاربر'
};

function isQuestionAnswered(question, answer) {
  if ((question?.type || 'single_choice') === 'multiple_choice') {
    return Array.isArray(answer) && answer.length >= 2;
  }
  const selected = Number(answer);
  return answer !== null && answer !== undefined && answer !== '' &&
    Number.isInteger(selected) && selected >= 0 && selected < (question?.options?.length || 4);
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('tm_user');
      return null;
    }
  });

  const [dbStatus, setDbStatus] = useState({ checked: false, ok: true, message: '' });

  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testSearch, setTestSearch] = useState('');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const [takingTest, setTakingTest] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submittingTest, setSubmittingTest] = useState(false);

  const [selectedAttempt, setSelectedAttempt] = useState(null);

  // بررسی اتصال سرور و دیتابیس هنگام باز شدن صفحه
  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setDbStatus({ checked: true, ok: true, message: data.message });
        } else {
          setDbStatus({
            checked: true,
            ok: false,
            message: data.error || 'خطا در اتصال به دیتابیس Supabase'
          });
        }
      })
      .catch(() => {
        setDbStatus({
          checked: true,
          ok: false,
          message: 'سرور بک‌اند (پورت 3001) در حال اجرا نیست. دستور npm run dev را اجرا کنید.'
        });
      });
  }, []);

  useEffect(() => {
    if (user) fetchAllData();
  }, [user]);

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  useEffect(() => {
    if (!takingTest || !user) return;
    const draftKey = `tm_answers_${user.id}_${takingTest.id}`;
    try {
      localStorage.setItem(draftKey, JSON.stringify(userAnswers));
    } catch (error) {
      console.warn('Could not save answer draft:', error);
    }
  }, [userAnswers, takingTest, user]);

  async function fetchAllData() {
    setDataLoading(true);
    try {
      const [testsRes, attemptsRes] = await Promise.all([
        fetch('/api/tests?include_archived=true'),
        fetch('/api/attempts')
      ]);
      const [testsData, attemptsData] = await Promise.all([
        testsRes.json(), attemptsRes.json()
      ]);
      if (!testsRes.ok) throw new Error(testsData.error || 'دریافت آزمون‌ها ناموفق بود.');
      if (!attemptsRes.ok) throw new Error(attemptsData.error || 'دریافت نتایج ناموفق بود.');
      setTests(Array.isArray(testsData.tests) ? testsData.tests : []);
      setAttempts(Array.isArray(attemptsData.attempts) ? attemptsData.attempts : []);

      if (user?.role === 'super_admin') {
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (!usersRes.ok) throw new Error(usersData.error || 'دریافت کاربران ناموفق بود.');
        setAllUsers(Array.isArray(usersData.users) ? usersData.users : []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      alert(err.message || 'بارگذاری اطلاعات با مشکل مواجه شد.');
    } finally {
      setDataLoading(false);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setLoading(true);

    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'خطایی رخ داد.');
      } else {
        setUser(data.user);
        localStorage.setItem('tm_user', JSON.stringify(data.user));
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setAuthError('خطا در ارتباط با سرور بک‌اند.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem('tm_user');
    setTakingTest(null);
    setSelectedAttempt(null);
    setActiveTab('tests');
  }

  async function handleRoleChange(targetUserId, newRole) {
    try {
      const res = await fetch(`/api/users/${targetUserId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: data.user.role } : u))
        );
      } else {
        alert(data.error || 'خطا در تغییر نقش');
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  }

  async function handleDeleteTest(testId) {
    if (!confirm('این آزمون آرشیو می‌شود و از فهرست آزمون‌های فعال کنار می‌رود؛ کارنامه‌های قبلی حفظ می‌شوند. ادامه می‌دهید؟')) return;
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setTests((prev) => prev.map((test) => test.id === testId ? { ...test, is_archived: true } : test));
      } else {
        alert(data.error || 'آرشیو آزمون انجام نشد.');
      }
    } catch (err) {
      alert('ارتباط با سرور برای آرشیو آزمون برقرار نشد.');
    }
  }

  function startTest(test) {
    const draftKey = `tm_answers_${user.id}_${test.id}`;
    let savedAnswers = {};
    try {
      savedAnswers = JSON.parse(localStorage.getItem(draftKey) || '{}');
    } catch {
      localStorage.removeItem(draftKey);
    }
    setTakingTest(test);
    setUserAnswers(savedAnswers && typeof savedAnswers === 'object' ? savedAnswers : {});
  }

  function startEditingTest(test) {
    setEditingTest(test);
    setActiveTab('create_test');
  }

  function selectQuestionOption(questionIndex, optionIndex, isMultiple) {
    setUserAnswers((previous) => {
      if (!isMultiple) return { ...previous, [questionIndex]: optionIndex };
      const current = Array.isArray(previous[questionIndex]) ? previous[questionIndex] : [];
      const next = current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b);
      return { ...previous, [questionIndex]: next };
    });
  }

  async function submitTestAnswers() {
    if (!takingTest || submittingTest) return;
    const unanswered = takingTest.questions.filter((question, index) =>
      !isQuestionAnswered(question, userAnswers[index])
    ).length;
    if (unanswered > 0 && !confirm(`${unanswered} سؤال بدون پاسخ باقی مانده است. آزمون با همین وضعیت ثبت شود؟`)) return;
    setSubmittingTest(true);
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: takingTest.id,
          user_id: user.id,
          username: user.username,
          answers: userAnswers
        })
      });
      const data = await res.json();
      if (res.ok && data.attempt) {
        setAttempts((prev) => [data.attempt, ...prev]);
        localStorage.removeItem(`tm_answers_${user.id}_${takingTest.id}`);
        setTakingTest(null);
        setUserAnswers({});
        setSelectedAttempt(data.attempt);
      } else {
        alert(data.error || 'خطا در ثبت آزمون');
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmittingTest(false);
    }
  }

  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-layout">
          <aside className="auth-showcase" aria-label="معرفی سامانه آزمون‌ساز">
            <div className="showcase-orbit orbit-one" />
            <div className="showcase-orbit orbit-two" />
            <div className="showcase-topline"><span className="showcase-dot" /> فضای هوشمند سنجش و یادگیری</div>
            <div className="showcase-brand">
              <span className="showcase-brand-mark"><BookOpen size={25} /></span>
              <span>TEST MAKER</span>
            </div>
            <div className="showcase-copy">
              <span className="showcase-kicker">THINK · TEST · GROW</span>
              <h2>هر آزمون،<br /><em>یک قدم</em> رو به جلو.</h2>
              <p>آزمون‌ها را بساز، دانش را بسنج و مسیر پیشرفت را با نگاهی روشن دنبال کن.</p>
            </div>
            <div className="showcase-feature-list">
              <div><span className="showcase-feature-icon"><ClipboardList size={17} /></span><span><b>طراحی ساده و منعطف</b><small>از سؤال تا انتشار، همه‌چیز یک‌جا</small></span></div>
              <div><span className="showcase-feature-icon"><BarChart2 size={17} /></span><span><b>نتایج قابل تحلیل</b><small>عملکردها را فراتر از یک نمره ببین</small></span></div>
            </div>
            <div className="showcase-floating-card"><span className="floating-card-check"><CheckCircle size={16} /></span><span><b>آماده‌ی شروعی؟</b><small>فضای کاربری تو آماده است</small></span><span className="floating-card-spark">✦</span></div>
            <div className="showcase-footer">A BETTER WAY TO ASSESS</div>
          </aside>

          <div className="auth-card">
          <div className="auth-card-heading">
            <div className="auth-mobile-brand"><span className="brand-mark"><BookOpen size={22} /></span><span>Test Maker</span></div>
            <span className="auth-overline">به فضای یادگیری خوش آمدی</span>
            <h1>شروع مسیرت</h1>
            <p>برای ادامه، وارد حساب کاربری خودت شو یا یک حساب جدید بساز.</p>
            <div className="auth-install"><PWAInstallPrompt /></div>
          </div>

          {dbStatus.checked && !dbStatus.ok && (
            <div className="alert alert-error">
              <strong>وضعیت دیتابیس:</strong> {dbStatus.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              type="button"
              className={`btn btn-block ${authMode === 'login' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
            >
              ورود
            </button>
            <button
              type="button"
              className={`btn btn-block ${authMode === 'register' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
            >
              ثبت نام
            </button>
          </div>

          {authError && <div className="alert alert-error">{authError}</div>}
          {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label>نام کاربری</label>
              <input
                type="text"
                placeholder="نام کاربری خود را وارد کنید..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>رمز عبور</label>
              <input
                type="password"
                placeholder="رمز عبور را وارد کنید..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading
                ? 'در حال پردازش...'
                : authMode === 'login'
                ? 'ورود به حساب کاربری'
                : 'ساخت حساب کاربری'}
            </button>
          </form>
          <div className="auth-card-foot"><span className="auth-foot-line" /> تجربه‌ای متمرکز برای سنجش بهتر <span className="auth-foot-line" /></div>
          </div>
        </div>
      </div>
    );
  }

  const canCreateTests = user.role === 'super_admin' || user.role === 'designer';
  const activeTests = tests.filter((test) => !test.is_archived);
  const myAttempts = attempts.filter((a) => a.user_id === user.id);
  const normalizedTestSearch = testSearch.trim().toLocaleLowerCase('fa');
  const visibleTests = activeTests.filter((test) =>
    !normalizedTestSearch || `${test.title} ${test.creator_username}`.toLocaleLowerCase('fa').includes(normalizedTestSearch)
  );
  const myAverageScore = myAttempts.length
    ? `${(myAttempts.reduce((sum, attempt) => sum + (Number(attempt.max_score) > 0 ? (Number(attempt.score) / Number(attempt.max_score)) * 100 : 0), 0) / myAttempts.length).toFixed(1)}٪`
    : '—';
  const myPassRate = myAttempts.length
    ? `${Math.round((myAttempts.filter((attempt) => attempt.passed).length / myAttempts.length) * 100)}٪`
    : '—';
  const myBestScore = myAttempts.length
    ? `${Math.max(...myAttempts.map((attempt) => Number(attempt.max_score) > 0 ? (Number(attempt.score) / Number(attempt.max_score)) * 100 : 0)).toFixed(1)}٪`
    : '—';

  const designerTestIds = new Set(
    tests.filter((t) => t.creator_id === user.id).map((t) => t.id)
  );
  const designerVisibleAttempts =
    user.role === 'super_admin'
      ? attempts
      : attempts.filter((a) => designerTestIds.has(a.test_id));

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="brand">
          <span className="brand-mark"><BookOpen size={22} /></span>
          <span className="brand-copy"><b>Test Maker</b><small>ASSESSMENT WORKSPACE</small></span>
        </div>

        <div className="user-badge">
          <PWAInstallPrompt compact />
          <span className="user-avatar" aria-hidden="true">{(user.username || 'U').slice(0, 1).toUpperCase()}</span>
          <span className="user-name">{user.username}</span>
          <span className={`role-pill role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
          <button className="btn btn-outline btn-sm logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      <main className="container">
        {!isOnline && <div className="alert alert-warning" role="status">اتصال اینترنت قطع است. نسخه نصب‌شده باز می‌شود، اما دریافت آزمون‌ها و ثبت پاسخ‌ها تا زمان اتصال مجدد در دسترس نیست.</div>}
        {dbStatus.checked && !dbStatus.ok && (
          <div className="alert alert-error">
            <strong>خطای اتصال:</strong> {dbStatus.message}
          </div>
        )}

        {takingTest ? (
          <div className="card exam-panel">
            <div
              className="exam-heading"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 16,
                marginBottom: 20
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{takingTest.title}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  سقف نمره: {takingTest.max_score} | حداقل قبولی: {takingTest.pass_score} | تعداد سؤالات: {takingTest.questions.length}
                </p>
                <div className="exam-progress" aria-live="polite">
                  <span>پاسخ داده‌شده: {takingTest.questions.filter((question, index) => isQuestionAnswered(question, userAnswers[index])).length} از {takingTest.questions.length}</span>
                  <div className="progress-track"><span style={{ width: `${(takingTest.questions.filter((question, index) => isQuestionAnswered(question, userAnswers[index])).length / takingTest.questions.length) * 100}%` }} /></div>
                  <small>پاسخ‌ها روی همین دستگاه به‌طور خودکار ذخیره می‌شوند.</small>
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setTakingTest(null)}>
                انصراف و بازگشت
              </button>
            </div>

            {takingTest.questions.map((q, qIdx) => {
              const isMultiple = (q.type || 'single_choice') === 'multiple_choice';
              const selectedValues = Array.isArray(userAnswers[qIdx]) ? userAnswers[qIdx] : [];
              const typeLabel = isMultiple ? 'چندپاسخی' : q.type === 'true_false' ? 'درست / نادرست' : 'تک‌پاسخی';
              return (
                <div key={qIdx} className="question-box">
                  <div className="question-prompt-row">
                    <div style={{ fontWeight: 700 }}>سؤال {qIdx + 1}: {q.text}</div>
                    <span className="question-type-badge">{typeLabel}</span>
                  </div>
                  {isMultiple && <p className="muted-copy">می‌توانید بیش از یک گزینه را انتخاب کنید.</p>}
                  {q.options.map((opt, optIdx) => {
                    const isSelected = isMultiple
                      ? selectedValues.includes(optIdx)
                      : userAnswers[qIdx] === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`option-choice ${isSelected ? 'selected' : ''}`}
                        role={isMultiple ? 'checkbox' : 'radio'}
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectQuestionOption(qIdx, optIdx, isMultiple);
                          }
                        }}
                        onClick={() => selectQuestionOption(qIdx, optIdx, isMultiple)}
                      >
                        <input
                          type={isMultiple ? 'checkbox' : 'radio'}
                          name={`q_${qIdx}`}
                          checked={isSelected}
                          aria-label={opt}
                          onChange={() => {}}
                        />
                        <span>{optIdx + 1}) {opt}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <button
              className="btn btn-success btn-block"
              style={{ padding: 14, fontSize: '1rem' }}
              onClick={submitTestAnswers}
              disabled={submittingTest}
            >
              <CheckCircle size={20} />
              {submittingTest ? 'در حال ثبت و تصحیح...' : 'پایان آزمون و مشاهده کارنامه'}
            </button>
          </div>
        ) : (
          <>
            {dataLoading && <div className="alert alert-info" role="status">در حال دریافت اطلاعات و نتایج...</div>}
            <section className="dashboard-hero">
              <div className="hero-content">
                <span className="hero-eyebrow"><span className="hero-eyebrow-dot" /> پنل اختصاصی شما</span>
                <h1>سلام {user.username}،<br /><span>آماده‌ی یک پیشرفت تازه‌ای؟</span></h1>
                <p>{canCreateTests ? 'آزمون طراحی کن، نتایج را بررسی کن و کیفیت یادگیری را دقیق‌تر بسنج.' : 'آزمون مناسب را انتخاب کن، با تمرکز پیش برو و روند پیشرفتت را دنبال کن.'}</p>
                <div className="hero-actions">
                  {canCreateTests && <button className="btn hero-cta" onClick={() => { setEditingTest(null); setActiveTab('create_test'); }}><PlusCircle size={17} /> طراحی آزمون جدید</button>}
                  <span className="hero-note"><span className="hero-note-pulse" /> فضای کاربری فعال</span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="hero-art-ring ring-a" /><div className="hero-art-ring ring-b" />
                <div className="hero-art-core"><BookOpen size={55} strokeWidth={1.35} /></div>
                <div className="hero-art-chip chip-top"><CheckCircle size={15} /> یادگیری هدفمند</div>
                <div className="hero-art-chip chip-bottom"><BarChart2 size={16} /> تحلیل عملکرد</div>
                <span className="hero-art-star star-a">✦</span><span className="hero-art-star star-b">✧</span>
              </div>
              <div className="hero-index">01 <span>/ WORKSPACE</span></div>
            </section>
            <div className="metrics-grid">
              <div className="metric-card metric-violet"><span className="metric-icon"><ClipboardList size={19} /></span><span className="metric-label">آزمون‌های فعال</span><strong>{activeTests.length}</strong><small>آزمون قابل شرکت</small></div>
              <div className="metric-card metric-blue"><span className="metric-icon"><Award size={19} /></span><span className="metric-label">دفعات شرکت شما</span><strong>{myAttempts.length}</strong><small>تلاش ثبت‌شده</small></div>
              <div className="metric-card metric-mint"><span className="metric-icon"><BarChart2 size={19} /></span><span className="metric-label">میانگین درصد نمرات</span><strong>{myAverageScore}</strong><small>میانگین عملکرد</small></div>
              <div className="metric-card metric-orange"><span className="metric-icon"><CheckCircle size={19} /></span><span className="metric-label">نرخ قبولی شما</span><strong>{myPassRate}</strong><small>از تمام تلاش‌ها</small></div>
              <div className="metric-card metric-pink"><span className="metric-icon"><Award size={19} /></span><span className="metric-label">بهترین درصد شما</span><strong>{myBestScore}</strong><small>بهترین نتیجه</small></div>
            </div>
            <div className="tabs">
              <button
                className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
                onClick={() => setActiveTab('tests')}
              >
                <ClipboardList size={18} />
                آزمون‌های فعال ({activeTests.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'my_results' ? 'active' : ''}`}
                onClick={() => setActiveTab('my_results')}
              >
                <Award size={18} />
                کارنامه‌های من ({myAttempts.length})
              </button>

              {canCreateTests && (
                <button
                  className={`tab-btn ${activeTab === 'create_test' ? 'active' : ''}`}
                  onClick={() => { setEditingTest(null); setActiveTab('create_test'); }}
                >
                  <PlusCircle size={18} />
                  ساخت آزمون جدید
                </button>
              )}

              {canCreateTests && (
                <button
                  className={`tab-btn ${activeTab === 'designer_results' ? 'active' : ''}`}
                  onClick={() => setActiveTab('designer_results')}
                >
                  <BarChart2 size={18} />
                  {user.role === 'super_admin'
                    ? 'گزارش جامع نتایج و عملکردها'
                    : 'نتایج شرکت‌کنندگان آزمون‌های من'}
                </button>
              )}

              {user.role === 'super_admin' && (
                <button
                  className={`tab-btn ${activeTab === 'admin_users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin_users')}
                >
                  <Users size={18} />
                  مدیریت کاربران و طراحان
                </button>
              )}
            </div>

            {activeTab === 'tests' && (
              <div className="tests-workspace">
                <div className="content-heading tests-heading">
                  <div><span className="content-eyebrow">LIBRARY / ASSESSMENTS</span><h2>آزمون‌های در دسترس</h2><p>یک آزمون انتخاب کن و دانسته‌هایت را به چالش بکش.</p></div>
                  <div className="test-search-wrap"><input type="search" value={testSearch} onChange={(event) => setTestSearch(event.target.value)}
                    placeholder="جست‌وجوی آزمون یا طراح..." aria-label="جست‌وجوی آزمون‌ها" /></div>
                </div>
                {activeTests.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    هنوز هیچ آزمون فعالی وجود ندارد.
                  </div>
                ) : visibleTests.length === 0 ? (
                  <div className="card empty-state">آزمونی با این عبارت پیدا نشد.</div>
                ) : (
                  <div className="grid-2">
                    {visibleTests.map((t) => {
                      const myCount = myAttempts.filter((a) => a.test_id === t.id).length;
                      return (
                        <article key={t.id} className="card test-card">
                          <div className="test-card-head"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: 12
                            }}
                          >
                            <div className="test-card-title-wrap"><span className="test-card-symbol"><ClipboardList size={20} /></span><div><span className="test-card-kicker">ASSESSMENT</span><h3>{t.title}</h3></div></div>
                            {(user.role === 'super_admin' || t.creator_id === user.id) && (
                              <div className="test-card-actions">
                                {attempts.every((attempt) => attempt.test_id !== t.id) && (
                                  <button className="btn btn-outline btn-sm" title="ویرایش آزمون" onClick={() => startEditingTest(t)}>
                                    ویرایش
                                  </button>
                                )}
                                <button className="btn btn-danger btn-sm" title="آرشیو آزمون" onClick={() => handleDeleteTest(t.id)}>
                                  <Trash2 size={15} />
                                  <span>آرشیو</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="test-meta">
                            <span>
                              طراح آزمون: <strong>{t.creator_username}</strong>
                            </span>
                            <span>
                              تعداد سوالات: <strong>{t.questions?.length || 0} سوال</strong>
                            </span>
                            <span>
                              نمره کل: <strong>از {t.max_score}</strong> | حداقل قبولی:{' '}
                              <strong>{t.pass_score}</strong>
                            </span>
                            <span>
                              دفعات شرکت شما: <strong>{myCount} بار</strong>
                            </span>
                          </div>

                          <button
                            className="btn btn-primary btn-block test-start-btn"
                            onClick={() => startTest(t)}
                          >
                            شروع آزمون <span aria-hidden="true">←</span>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'my_results' && (
              <div className="card">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>
                  تاریخچه آزمون‌های من
                </h2>
                {myAttempts.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>شما هنوز در هیچ آزمونی شرکت نکرده‌اید.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>عنوان آزمون</th>
                          <th>نمره کسب شده</th>
                          <th>حد نصاب قبولی</th>
                          <th>وضعیت</th>
                          <th>تاریخ</th>
                          <th>جزئیات پاسخ‌ها</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myAttempts.map((att) => (
                          <tr key={att.id}>
                            <td style={{ fontWeight: 700 }}>{att.test_title}</td>
                            <td>
                              <strong>{att.score}</strong> از {att.max_score}
                            </td>
                            <td>{att.pass_score}</td>
                            <td>
                              {att.passed ? (
                                <span className="badge-pass">قبول</span>
                              ) : (
                                <span className="badge-fail">مردود</span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                              {new Date(att.created_at).toLocaleString('fa-IR')}
                            </td>
                            <td>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setSelectedAttempt(att)}
                              >
                                <Eye size={15} />
                                بررسی سوالات
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'create_test' && canCreateTests && (
              <TestCreatorForm
                key={editingTest?.id || 'new-test'}
                user={user}
                initialTest={editingTest}
                onCreated={(savedTest, wasEdit) => {
                  if (wasEdit) {
                    setTests((prev) => prev.map((test) => test.id === savedTest.id ? savedTest : test));
                  } else {
                    setTests((prev) => [savedTest, ...prev]);
                  }
                  setEditingTest(null);
                  setActiveTab('tests');
                }}
                onCancel={() => { setEditingTest(null); setActiveTab('tests'); }}
              />
            )}

            {activeTab === 'designer_results' && canCreateTests && (
              <AdminAndDesignerReports
                user={user}
                tests={tests}
                attempts={designerVisibleAttempts}
                onInspectAttempt={(att) => setSelectedAttempt(att)}
              />
            )}

            {activeTab === 'admin_users' && user.role === 'super_admin' && (
              <div className="card">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6 }}>
                  مدیریت کاربران و طراحان آزمون
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 18 }}>
                  در این بخش می‌توانید کاربران ثبت‌نام شده را به «طراح آزمون» ارتقا دهید و آزمون‌های
                  ساخته شده توسط هر طراح را مشاهده کنید.
                </p>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>شناسه</th>
                        <th>نام کاربری</th>
                        <th>نقش فعلی</th>
                        <th>آزمون‌های ساخته شده</th>
                        <th>تعداد کل آزمون‌های داده شده</th>
                        <th>عملیات ارتقا / تغییر نقش</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u) => {
                        const createdTests = tests.filter((t) => t.creator_id === u.id);
                        const userAttemptCount = attempts.filter((a) => a.user_id === u.id).length;

                        return (
                          <tr key={u.id}>
                            <td>#{u.id}</td>
                            <td style={{ fontWeight: 700 }}>{u.username}</td>
                            <td>
                              <span className={`role-pill role-${u.role}`}>
                                {ROLE_LABELS[u.role]}
                              </span>
                            </td>
                            <td>
                              {createdTests.length === 0 ? (
                                <span style={{ color: 'var(--muted)' }}>۰ آزمون</span>
                              ) : (
                                <div>
                                  <strong>{createdTests.length} آزمون:</strong>{' '}
                                  <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                                    {createdTests.map((ct) => ct.title).join('، ')}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td>{userAttemptCount} بار</td>
                            <td>
                              {u.role === 'super_admin' ? (
                                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                  ادمین اصلی سیستم
                                </span>
                              ) : u.role === 'user' ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleRoleChange(u.id, 'designer')}
                                >
                                  <ShieldCheck size={15} />
                                  ارتقا به طراح آزمون
                                </button>
                              ) : (
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleRoleChange(u.id, 'user')}
                                >
                                  <UserCheck size={15} />
                                  تغییر به کاربر عادی
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {selectedAttempt && (
          <div className="modal-backdrop" onClick={() => setSelectedAttempt(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 14,
                  marginBottom: 16
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    کارنامه آزمون: {selectedAttempt.test_title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 4 }}>
                    شرکت‌کننده: <strong>{selectedAttempt.username}</strong> | نمره:{' '}
                    <strong>
                      {selectedAttempt.score} از {selectedAttempt.max_score}
                    </strong>{' '}
                    | وضعیت:{' '}
                    {selectedAttempt.passed ? (
                      <span className="badge-pass">قبول شده</span>
                    ) : (
                      <span className="badge-fail">مردود شده</span>
                    )}
                  </p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedAttempt(null)}>
                  بستن
                </button>
              </div>

              {(selectedAttempt.details || []).map((item, idx) => (
                <div key={idx} className="question-box">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 10,
                      marginBottom: 8
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      سؤال {idx + 1}: {item.questionText}
                    </span>
                    <span className="question-type-badge">
                      {item.type === 'multiple_choice' ? 'چندپاسخی' : item.type === 'true_false' ? 'درست / نادرست' : 'تک‌پاسخی'} · ضریب {item.weight ?? 1}
                    </span>
                    {item.isCorrect ? (
                      <span
                        style={{
                          color: 'var(--success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 700,
                          fontSize: '0.88rem'
                        }}
                      >
                        <CheckCircle size={17} /> پاسخ صحیح
                      </span>
                    ) : (
                      <span
                        style={{
                          color: 'var(--danger)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 700,
                          fontSize: '0.88rem'
                        }}
                      >
                        <XCircle size={17} /> پاسخ اشتباه
                      </span>
                    )}
                  </div>

                  {item.options.map((opt, oIdx) => {
                    const isMultiple = item.type === 'multiple_choice';
                    const isCorrectOption = isMultiple
                      ? (item.correctIndices || []).includes(oIdx)
                      : oIdx === item.correctIndex;
                    const isSelectedOption = isMultiple
                      ? (item.selectedIndices || []).includes(oIdx)
                      : oIdx === item.selectedIndex;
                    let cls = 'option-choice';
                    if (isCorrectOption) cls += ' correct';
                    else if (isSelectedOption) cls += ' wrong';

                    return (
                      <div key={oIdx} className={cls} style={{ cursor: 'default' }}>
                        <span>{oIdx + 1}) {opt}</span>
                        {isCorrectOption && <strong className="option-result-tag">(پاسخ صحیح)</strong>}
                        {isSelectedOption && !isCorrectOption && <strong className="option-result-tag">(انتخاب شما)</strong>}
                      </div>
                    );
                  })}

                  {(item.type === 'multiple_choice'
                    ? !(item.selectedIndices || []).length
                    : item.selectedIndex === -1) && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.84rem', marginTop: 8 }}>
                      * به این سؤال پاسخی داده نشده است.
                    </p>
                  )}
                  {item.explanation && (
                    <div className="answer-explanation"><strong>توضیح پاسخ:</strong> {item.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="app-footer"><span>TEST MAKER</span><span>سنجش دقیق‌تر، مسیر روشن‌تر.</span><span>© {new Date().getFullYear()}</span></footer>
    </div>
  );
}

function TestCreatorForm({ user, initialTest, onCreated, onCancel }) {
  const [title, setTitle] = useState(initialTest?.title || '');
  const [maxScore, setMaxScore] = useState(initialTest?.max_score || 20);
  const [passScore, setPassScore] = useState(initialTest?.pass_score ?? 10);
  const [questions, setQuestions] = useState(() => initialTest?.questions?.map((question) => ({
    type: question.type || 'single_choice',
    text: question.text || '',
    options: Array.isArray(question.options) ? [...question.options] : ['', '', '', ''],
    correctIndex: question.correctIndex === null || question.correctIndex === undefined || String(question.correctIndex).trim() === ''
      ? null
      : Number.isInteger(Number(question.correctIndex)) ? Number(question.correctIndex) : null,
    correctIndices: Array.isArray(question.correctIndices) ? question.correctIndices.map(Number) : [],
    weight: question.weight ?? 1,
    explanation: question.explanation || ''
  })) || [{ type: 'single_choice', text: '', options: ['', '', '', ''], correctIndex: null, correctIndices: [], weight: 1, explanation: '' }]);
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    setQuestions((prev) => [...prev, {
      type: 'single_choice', text: '', options: ['', '', '', ''], correctIndex: null,
      correctIndices: [], weight: 1, explanation: ''
    }]);
  }

  function removeQuestion(index) {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index, changes) {
    setQuestions((prev) => prev.map((question, i) =>
      i === index ? { ...question, ...changes } : question
    ));
  }

  function updateQuestionType(index, type) {
    setQuestions((prev) => prev.map((question, questionIndex) => {
      if (questionIndex !== index) return question;
      const options = type === 'true_false'
        ? ['درست', 'نادرست']
        : question.options.length === 4 ? question.options : ['', '', '', ''];
      return { ...question, type, options, correctIndex: null, correctIndices: [] };
    }));
  }

  function toggleCorrectIndex(questionIndex, optionIndex) {
    setQuestions((prev) => prev.map((question, index) => {
      if (index !== questionIndex) return question;
      const current = Array.isArray(question.correctIndices) ? question.correctIndices : [];
      const next = current.includes(optionIndex)
        ? current.filter((value) => value !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b);
      return { ...question, correctIndices: next };
    }));
  }

  function updateOption(questionIndex, optionIndex, value) {
    setQuestions((prev) => prev.map((question, i) => {
      if (i !== questionIndex) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) return alert('عنوان آزمون را وارد کنید.');
    if (!Number.isFinite(Number(passScore)) || Number(passScore) < 0 || Number(passScore) > Number(maxScore)) {
      return alert('نمره قبولی باید بین صفر و سقف نمره آزمون باشد.');
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      if (!question.text.trim()) return alert(`متن سؤال شماره ${index + 1} را وارد کنید.`);
      const questionType = question.type || 'single_choice';
      const expectedOptions = questionType === 'true_false' ? 2 : 4;
      if (question.options.length !== expectedOptions || question.options.some((option) => !option.trim())) {
        return alert(questionType === 'true_false'
          ? `دو گزینه سؤال درست/نادرست شماره ${index + 1} باید تکمیل شوند.`
          : `هر چهار گزینه سؤال شماره ${index + 1} باید تکمیل شوند.`);
      }
      if (questionType === 'multiple_choice') {
        if (!Array.isArray(question.correctIndices) || question.correctIndices.length < 2) {
          return alert(`برای سؤال چندپاسخی شماره ${index + 1} حداقل دو پاسخ صحیح انتخاب کنید.`);
        }
      } else if (question.correctIndex === null || question.correctIndex === undefined || String(question.correctIndex).trim() === '' ||
          !Array.from({ length: expectedOptions }, (_, optionIndex) => optionIndex).includes(Number(question.correctIndex))) {
        return alert(`پاسخ صحیح سؤال شماره ${index + 1} را انتخاب کنید.`);
      }
      if (!Number.isFinite(Number(question.weight)) || Number(question.weight) <= 0 || Number(question.weight) > 100) {
        return alert(`وزن سؤال شماره ${index + 1} باید بین ۰ تا ۱۰۰ باشد.`);
      }
    }

    setSaving(true);
    try {
      const isEdit = Boolean(initialTest?.id);
      const endpoint = isEdit ? `/api/tests/${initialTest.id}` : '/api/tests';
      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          max_score: Number(maxScore),
          pass_score: Number(passScore),
          creator_id: user.id,
          creator_username: user.username,
          questions: questions.map((question) => ({
            ...question,
            type: question.type || 'single_choice',
            text: question.text.trim(),
            options: question.options.map((option) => option.trim()),
            correctIndex: question.type === 'multiple_choice' ? null : Number(question.correctIndex),
            correctIndices: question.type === 'multiple_choice' ? question.correctIndices.map(Number) : [],
            weight: Number(question.weight),
            explanation: question.explanation.trim()
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.test) {
        onCreated(data.test, isEdit);
      } else {
        alert(data.error || 'ذخیره آزمون ناموفق بود.');
      }
    } catch (error) {
      alert('ارتباط با سرور برای ذخیره آزمون برقرار نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card test-editor">
      <div className="section-heading">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            {initialTest ? 'ویرایش آزمون' : 'طراحی آزمون جدید'}
          </h2>
          <p className="muted-copy">پاسخ صحیح، وزن و توضیح هر سؤال را پیش از انتشار بررسی کنید.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>بازگشت</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-3">
          <div className="form-group">
            <label>نام آزمون</label>
            <input type="text" placeholder="مثلاً: آزمون مبانی برنامه‌نویسی" value={title}
              onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
          </div>
          <div className="form-group">
            <label>مقیاس نمره‌دهی آزمون</label>
            <select value={maxScore} onChange={(event) => {
              const value = Number(event.target.value);
              setMaxScore(value);
              setPassScore(value === 20 ? 10 : 50);
            }}>
              <option value={20}>از ۲۰ نمره</option>
              <option value={100}>از ۱۰۰ نمره</option>
            </select>
          </div>
          <div className="form-group">
            <label>حداقل نمره قبولی (از {maxScore})</label>
            <input type="number" step="0.5" min="0" max={maxScore} value={passScore}
              onChange={(event) => setPassScore(event.target.value)} required />
          </div>
        </div>

        <div className="editor-divider" />

        {questions.map((question, questionIndex) => (
          <section key={questionIndex} className="question-box editor-question">
            <div className="question-editor-heading">
              <strong>سؤال شماره {questionIndex + 1}</strong>
              <div className="question-editor-tools">
                <label className="question-type-control">
                  <span>نوع سؤال</span>
                  <select value={question.type || 'single_choice'} onChange={(event) => updateQuestionType(questionIndex, event.target.value)}>
                    <option value="single_choice">تک‌پاسخی</option>
                    <option value="multiple_choice">چندپاسخی</option>
                    <option value="true_false">درست / نادرست</option>
                  </select>
                </label>
                <label className="weight-control">
                  <span>ضریب سؤال</span>
                  <input type="number" min="0.1" max="100" step="0.1" value={question.weight}
                    onChange={(event) => updateQuestion(questionIndex, { weight: event.target.value })} />
                </label>
                {questions.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQuestion(questionIndex)}>
                    حذف سؤال
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>متن سؤال</label>
              <textarea rows="2" placeholder="صورت سؤال را بنویسید..." value={question.text}
                onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })} required />
            </div>

            <p className="muted-copy">
              {(question.type || 'single_choice') === 'multiple_choice'
                ? 'تمام گزینه‌های صحیح را با تیک مشخص کنید (حداقل دو گزینه).'
                : 'گزینه صحیح را با انتخاب دایره مشخص کنید.'}
            </p>
            {question.options.map((option, optionIndex) => {
              const isMultiple = question.type === 'multiple_choice';
              const isCorrect = isMultiple
                ? (question.correctIndices || []).includes(optionIndex)
                : question.correctIndex === optionIndex;
              return (
              <div key={optionIndex} className={`option-row ${isCorrect ? 'correct-option-row' : ''}`}>
                <label className="correct-radio-label" title="انتخاب به عنوان پاسخ صحیح">
                  <input
                    type={isMultiple ? 'checkbox' : 'radio'}
                    name={`correct_${questionIndex}`}
                    checked={isCorrect}
                    onChange={() => isMultiple
                      ? toggleCorrectIndex(questionIndex, optionIndex)
                      : updateQuestion(questionIndex, { correctIndex: optionIndex })}
                  />
                  <span>{optionIndex + 1}</span>
                </label>
                <input type="text" placeholder={`گزینه ${optionIndex + 1}`} value={option}
                  onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                  readOnly={question.type === 'true_false'} required />
              </div>
              );
            })}

            <div className="form-group explanation-field">
              <label>توضیح پاسخ صحیح <span className="optional-label">(اختیاری؛ پس از آزمون نمایش داده می‌شود)</span></label>
              <textarea rows="2" placeholder="دلیل درست بودن پاسخ را بنویسید..." value={question.explanation}
                onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })} />
            </div>
          </section>
        ))}

        <div className="editor-actions">
          <button type="button" className="btn btn-outline" onClick={addQuestion}>
            <PlusCircle size={18} /> افزودن سؤال
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <CheckCircle size={18} />
            {saving ? 'در حال ذخیره...' : initialTest ? 'ذخیره تغییرات' : 'ذخیره و انتشار آزمون'}
          </button>
        </div>
      </form>
    </div>
  );
}

function exportAttemptsCsv(attempts) {
  const columns = ['username', 'test_title', 'score', 'max_score', 'pass_score', 'passed', 'created_at'];
  const labels = ['نام کاربر', 'عنوان آزمون', 'نمره', 'نمره کل', 'حد نصاب قبولی', 'وضعیت قبولی', 'زمان ثبت'];
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [labels, ...attempts.map((attempt) => columns.map((column) => {
    if (column === 'passed') return attempt.passed ? 'قبول' : 'مردود';
    if (column === 'created_at') return new Date(attempt.created_at).toLocaleString('fa-IR');
    return attempt[column];
  }))];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `test-maker-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AdminAndDesignerReports({ user, tests, attempts, onInspectAttempt }) {
  const summaryMap = {};
  attempts.forEach((att) => {
    const key = `${att.username}___${att.test_id}`;
    if (!summaryMap[key]) {
      summaryMap[key] = {
        username: att.username,
        test_title: att.test_title,
        count: 0,
        bestScore: att.score,
        maxScore: att.max_score,
        lastStatus: att.passed
      };
    }
    summaryMap[key].count += 1;
    if (att.score > summaryMap[key].bestScore) {
      summaryMap[key].bestScore = att.score;
    }
  });

  const summaryList = Object.values(summaryMap);
  const reportTests = user.role === 'super_admin'
    ? tests
    : tests.filter((test) => test.creator_id === user.id);
  const questionAnalyses = reportTests.map((test) => {
    const testAttempts = attempts.filter((attempt) => attempt.test_id === test.id);
    const questions = (test.questions || []).map((question, questionIndex) => {
      const responses = testAttempts
        .map((attempt) => (attempt.details || []).find((detail) => detail.questionIndex === questionIndex))
        .filter(Boolean);
      const correct = responses.filter((response) => response.isCorrect).length;
      const percent = responses.length ? Math.round((correct / responses.length) * 100) : null;
      return { questionIndex, text: question.text, total: responses.length, correct, percent };
    });
    return { test, questions, attemptCount: testAttempts.length };
  });

  return (
    <div>
      {user.role === 'super_admin' && (
        <div className="card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>
            آزمون‌های ساخته شده به تفکیک طراح آزمون
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نام آزمون</th>
                  <th>طراح آزمون</th>
                  <th>مقیاس نمره</th>
                  <th>نمره قبولی</th>
                  <th>تعداد سوالات</th>
                  <th>شرکت‌کنندگان یکتا / دفعات شرکت</th>
                  <th>وضعیت آزمون</th>
                </tr>
              </thead>
              <tbody>
                {reportTests.map((t) => {
                  const testAttempts = attempts.filter((a) => a.test_id === t.id);
                  const uniqueParticipants = new Set(testAttempts.map((a) => a.user_id ?? a.username)).size;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>{t.title}</td>
                      <td>{t.creator_username}</td>
                      <td>از {t.max_score}</td>
                      <td>{t.pass_score}</td>
                      <td>{t.questions?.length || 0} سوال</td>
                      <td>{uniqueParticipants} نفر / {testAttempts.length} بار شرکت</td>
                      <td>{t.is_archived ? <span className="badge-fail">آرشیو شده</span> : <span className="badge-pass">فعال</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>
          آمار دفعات شرکت هر کاربر در هر آزمون
        </h3>
        {summaryList.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>هنوز آزمونی ثبت نشده است.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نام کاربر</th>
                  <th>نام آزمون</th>
                  <th>تعداد دفعات شرکت</th>
                  <th>بالاترین نمره</th>
                </tr>
              </thead>
              <tbody>
                {summaryList.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{row.username}</td>
                    <td>{row.test_title}</td>
                    <td>
                      <strong>{row.count} بار</strong>
                    </td>
                    <td>
                      {row.bestScore} از {row.maxScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>
          تحلیل عملکرد سؤالات
        </h3>
        <p className="muted-copy" style={{ marginBottom: 16 }}>
          درصد پاسخ صحیح هر سؤال بر اساس پاسخ‌برگ‌های ثبت‌شده محاسبه شده است.
        </p>
        {questionAnalyses.length === 0 ? (
          <p className="muted-copy">آزمونی برای تحلیل در دسترس نیست.</p>
        ) : (
          <div className="question-analysis-list">
            {questionAnalyses.map(({ test, questions, attemptCount }) => (
              <section key={test.id} className="question-analysis-section">
                <div className="question-analysis-title">
                  <strong>{test.title}</strong>
                  <span className={test.is_archived ? 'badge-fail' : 'badge-pass'}>
                    {test.is_archived ? 'آرشیو شده' : 'فعال'} · {attemptCount} بار شرکت
                  </span>
                </div>
                {attemptCount === 0 ? (
                  <p className="muted-copy">برای این آزمون هنوز پاسخی ثبت نشده است.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>سؤال</th><th>پاسخ صحیح</th><th>کل پاسخ‌ها</th><th>درصد پاسخ صحیح</th></tr>
                      </thead>
                      <tbody>
                        {questions.map((question) => (
                          <tr key={question.questionIndex}>
                            <td className="analysis-question-text">{question.questionIndex + 1}. {question.text}</td>
                            <td>{question.correct}</td>
                            <td>{question.total}</td>
                            <td>
                              <div className="analysis-rate">
                                <strong>{question.percent ?? 0}٪</strong>
                                <div className="progress-track"><span style={{ width: `${question.percent ?? 0}%` }} /></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-heading">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
            ریز نتایج تمام آزمون‌های داده شده
          </h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => exportAttemptsCsv(attempts)} disabled={!attempts.length}>
            <Download size={16} /> خروجی CSV
          </button>
        </div>
        {attempts.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>هنوز نتیجه‌ای ثبت نشده است.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>آزمون</th>
                  <th>نمره</th>
                  <th>وضعیت</th>
                  <th>زمان ثبت</th>
                  <th>بررسی پاسخ‌برگ</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att) => (
                  <tr key={att.id}>
                    <td style={{ fontWeight: 700 }}>{att.username}</td>
                    <td>{att.test_title}</td>
                    <td>
                      <strong>{att.score}</strong> از {att.max_score}
                    </td>
                    <td>
                      {att.passed ? (
                        <span className="badge-pass">قبول</span>
                      ) : (
                        <span className="badge-fail">مردود</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                      {new Date(att.created_at).toLocaleString('fa-IR')}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onInspectAttempt(att)}
                      >
                        <Eye size={15} />
                        مشاهده درست و غلط
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
