import React from 'react';
import { BookOpen, LogOut, Moon, Sun } from 'lucide-react';
import PWAInstallPrompt from '../PWAInstallPrompt.jsx';
import { ROLE_LABELS } from '../utils.js';

export default function Header({ user, theme, onToggleTheme, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="logo-mark"><BookOpen size={20} /></span>
          <span className="brand-text"><b>Test Maker</b><small>آزمون‌ساز آنلاین</small></span>
        </div>
        <div className="topbar-actions">
          <PWAInstallPrompt compact />
          <button type="button" className="icon-btn" onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'} title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">{(user.username || 'U').slice(0, 1).toUpperCase()}</span>
            <span className="user-chip-text">
              <b>{user.username}</b>
              <span className={`role-pill role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onLogout} aria-label="خروج" title="خروج"><LogOut size={19} /></button>
        </div>
      </div>
    </header>
  );
}
