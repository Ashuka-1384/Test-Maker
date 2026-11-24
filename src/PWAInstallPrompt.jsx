import React, { useEffect, useState } from 'react';

export default function PWAInstallPrompt({ compact = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone);

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try {
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  }

  if (installed) return null;

  if (installPrompt) {
    return (
      <button type="button" className={`btn btn-install ${compact ? 'btn-sm' : ''}`} onClick={handleInstall}>
        <span aria-hidden="true">＋</span> نصب اپلیکیشن
      </button>
    );
  }

  if (isIOS) {
    return (
      <details className={`ios-install-help ${compact ? 'compact' : ''}`}>
        <summary>نصب روی آیفون</summary>
        <p>در Safari دکمه Share را بزنید، سپس گزینه <b>Add to Home Screen</b> یا «افزودن به صفحه اصلی» را انتخاب کنید.</p>
      </details>
    );
  }

  return null;
}
