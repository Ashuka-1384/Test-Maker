import React, { useState, useEffect } from 'react';
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
  ClipboardList
} from 'lucide-react';

const ROLE_LABELS = {
  super_admin: 'ادمین اصلی',
  designer: 'طراح آزمون',
  user: 'کاربر'
};

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tm_user');
    return saved ? JSON.parse(saved) : null;
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
    if (user) {
      fetchAllData();
    }
  }, [user]);

  async function fetchAllData() {
    try {
      const [testsRes, attemptsRes] = await Promise.all([
        fetch('/api/tests'),
        fetch('/api/attempts')
      ]);
      const testsData = await testsRes.json();
      const attemptsData = await attemptsRes.json();
      if (testsData.tests) setTests(testsData.tests);
      if (attemptsData.attempts) setAttempts(attemptsData.attempts);

      if (user.role === 'super_admin') {
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (usersData.users) setAllUsers(usersData.users);
      }
    } catch (err) {
      console.error('Error loading data:', err);
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
    if (!confirm('آیا از حذف این آزمون مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== testId));
      }
    } catch (err) {
      alert('خطا در حذف آزمون');
    }
  }

  function startTest(test) {
    setTakingTest(test);
    setUserAnswers({});
  }

  async function submitTestAnswers() {
    if (!takingTest) return;
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
        setTakingTest(null);
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
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: '#eef2ff',
                color: '#4f46e5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}
            >
              <BookOpen size={30} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Test Maker</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
              سامانه آنلاین طراحی و برگزاری آزمون
            </p>
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
        </div>
      </div>
    );
  }

  const canCreateTests = user.role === 'super_admin' || user.role === 'designer';
  const myAttempts = attempts.filter((a) => a.user_id === user.id);

  const designerTestIds = new Set(
    tests.filter((t) => t.creator_id === user.id).map((t) => t.id)
  );
  const designerVisibleAttempts =
    user.role === 'super_admin'
      ? attempts
      : attempts.filter((a) => designerTestIds.has(a.test_id));

  return (
    <div>
      <header className="navbar">
        <div className="brand">
          <BookOpen size={26} />
          <span>Test Maker</span>
        </div>

        <div className="user-badge">
          <span style={{ fontWeight: 700 }}>{user.username}</span>
          <span className={`role-pill role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </header>

      <main className="container">
        {dbStatus.checked && !dbStatus.ok && (
          <div className="alert alert-error">
            <strong>خطای اتصال:</strong> {dbStatus.message}
          </div>
        )}

        {takingTest ? (
          <div className="card">
            <div
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
                  سقف نمره: {takingTest.max_score} | حداقل نمره قبولی: {takingTest.pass_score} |
                  تعداد سوالات: {takingTest.questions.length}
                </p>
              </div>
              <button className="btn btn-outline" onClick={() => setTakingTest(null)}>
                انصراف و بازگشت
              </button>
            </div>

            {takingTest.questions.map((q, qIdx) => (
              <div key={qIdx} className="question-box">
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  سوال {qIdx + 1}: {q.text}
                </div>
                {q.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[qIdx] === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`option-choice ${isSelected ? 'selected' : ''}`}
                      onClick={() =>
                        setUserAnswers((prev) => ({
                          ...prev,
                          [qIdx]: optIdx
                        }))
                      }
                    >
                      <input
                        type="radio"
                        name={`q_${qIdx}`}
                        checked={isSelected}
                        onChange={() => {}}
                      />
                      <span>
                        {optIdx + 1}) {opt}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

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
            <div className="tabs">
              <button
                className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
                onClick={() => setActiveTab('tests')}
              >
                <ClipboardList size={18} />
                لیست آزمون‌ها ({tests.length})
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
                  onClick={() => setActiveTab('create_test')}
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
              <div>
                {tests.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    هنوز هیچ آزمونی ساخته نشده است.
                  </div>
                ) : (
                  <div className="grid-2">
                    {tests.map((t) => {
                      const myCount = myAttempts.filter((a) => a.test_id === t.id).length;
                      return (
                        <div key={t.id} className="card" style={{ marginBottom: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: 12
                            }}
                          >
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t.title}</h3>
                            {(user.role === 'super_admin' || t.creator_id === user.id) && (
                              <button
                                className="btn btn-danger btn-sm"
                                title="حذف آزمون"
                                onClick={() => handleDeleteTest(t.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: '0.88rem',
                              color: 'var(--muted)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              marginBottom: 16
                            }}
                          >
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
                            className="btn btn-primary btn-block"
                            onClick={() => startTest(t)}
                          >
                            شروع آزمون
                          </button>
                        </div>
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
                user={user}
                onCreated={(newTest) => {
                  setTests((prev) => [newTest, ...prev]);
                  setActiveTab('tests');
                }}
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
                      alignItems: 'center',
                      marginBottom: 8
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      سوال {idx + 1}: {item.questionText}
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
                    let cls = 'option-choice';
                    if (oIdx === item.correctIndex) cls += ' correct';
                    else if (oIdx === item.selectedIndex && !item.isCorrect) cls += ' wrong';

                    return (
                      <div key={oIdx} className={cls} style={{ cursor: 'default' }}>
                        <span>
                          {oIdx + 1}) {opt}
                        </span>
                        {oIdx === item.correctIndex && (
                          <strong style={{ marginRight: 'auto', fontSize: '0.82rem' }}>
                            (گزینه صحیح)
                          </strong>
                        )}
                        {oIdx === item.selectedIndex && oIdx !== item.correctIndex && (
                          <strong style={{ marginRight: 'auto', fontSize: '0.82rem' }}>
                            (انتخاب شما)
                          </strong>
                        )}
                      </div>
                    );
                  })}

                  {item.selectedIndex === -1 && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.84rem', marginTop: 8 }}>
                      * به این سوال پاسخی داده نشده است.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TestCreatorForm({ user, onCreated }) {
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState(20);
  const [passScore, setPassScore] = useState(10);
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correctIndex: 0 }
  ]);
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    setQuestions((prev) => [...prev, { text: '', options: ['', '', '', ''], correctIndex: 0 }]);
  }

  function removeQuestion(index) {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestionText(index, value) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, text: value } : q)));
  }

  function updateOption(qIndex, optIndex, value) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const newOpts = [...q.options];
        newOpts[optIndex] = value;
        return { ...q, options: newOpts };
      })
    );
  }

  function updateCorrectOption(qIndex, correctIndex) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, correctIndex } : q))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return alert('نام آزمون را وارد کنید.');
    if (Number(passScore) > Number(maxScore) || Number(passScore) < 0) {
      return alert('نمره قبولی باید بین ۰ تا سقف نمره آزمون باشد.');
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
        return alert(`متن سوال شماره ${i + 1} را وارد کنید.`);
      }
      if (questions[i].options.some((opt) => !opt.trim())) {
        return alert(`تمام ۴ گزینه سوال شماره ${i + 1} باید پر شوند.`);
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          max_score: Number(maxScore),
          pass_score: Number(passScore),
          creator_id: user.id,
          creator_username: user.username,
          questions
        })
      });
      const data = await res.json();
      if (res.ok && data.test) {
        onCreated(data.test);
      } else {
        alert(data.error || 'خطا در ذخیره آزمون');
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 18 }}>
        طراحی آزمون چهارگزینه‌ای جدید
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid-3">
          <div className="form-group">
            <label>نام آزمون</label>
            <input
              type="text"
              placeholder="مثلاً: آزمون مبانی برنامه‌نویسی"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>مقیاس نمره‌دهی آزمون</label>
            <select
              value={maxScore}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxScore(val);
                setPassScore(val === 20 ? 10 : 50);
              }}
            >
              <option value={20}>از ۲۰ نمره</option>
              <option value={100}>از ۱۰۰ نمره</option>
            </select>
          </div>

          <div className="form-group">
            <label>حداقل نمره برای قبولی (از {maxScore})</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={maxScore}
              value={passScore}
              onChange={(e) => setPassScore(e.target.value)}
              required
            />
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />

        {questions.map((q, qIdx) => (
          <div key={qIdx} className="question-box">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <strong>سوال شماره {qIdx + 1}</strong>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeQuestion(qIdx)}
                >
                  حذف سوال
                </button>
              )}
            </div>

            <div className="form-group">
              <input
                type="text"
                placeholder="صورت سوال را بنویسید..."
                value={q.text}
                onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                required
              />
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginBottom: 6 }}>
              گزینه‌ها را وارد کنید و دایره کنار گزینه صحیح را انتخاب نمایید:
            </p>

            {q.options.map((opt, optIdx) => (
              <div key={optIdx} className="option-row">
                <input
                  type="radio"
                  name={`correct_${qIdx}`}
                  checked={q.correctIndex === optIdx}
                  onChange={() => updateCorrectOption(qIdx, optIdx)}
                  title="انتخاب به عنوان گزینه صحیح"
                />
                <input
                  type="text"
                  placeholder={`گزینه ${optIdx + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                  required
                />
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="btn btn-outline" onClick={addQuestion}>
            <PlusCircle size={18} />
            افزودن سوال بعدی
          </button>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <CheckCircle size={18} />
            {saving ? 'در حال انتشار آزمون...' : 'ذخیره و انتشار آزمون'}
          </button>
        </div>
      </form>
    </div>
  );
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
                  <th>تعداد کل شرکت‌کنندگان</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => {
                  const testAttempts = attempts.filter((a) => a.test_id === t.id);
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>{t.title}</td>
                      <td>{t.creator_username}</td>
                      <td>از {t.max_score}</td>
                      <td>{t.pass_score}</td>
                      <td>{t.questions?.length || 0} سوال</td>
                      <td>{testAttempts.length} بار</td>
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
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>
          ریز نتایج تمام آزمون‌های داده شده (با امکان مشاهده سوالات درست و اشتباه)
        </h3>
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
