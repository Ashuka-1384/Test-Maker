// لایه‌ی مشترک فراخوانی API؛ خطاها را به Error با پیام فارسی تبدیل می‌کند.
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* پاسخ غیر JSON */
  }
  if (!res.ok) {
    const error = new Error(data.error || 'خطایی رخ داد. دوباره تلاش کنید.');
    error.code = data.code;
    error.status = res.status;
    throw error;
  }
  return data;
}
