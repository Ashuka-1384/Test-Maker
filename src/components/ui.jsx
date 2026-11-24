import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

const TOAST_ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

// اعلان‌های شناور + دیالوگ تأیید؛ جایگزین alert() و confirm() مرورگر
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const counter = useRef(0);

  const toast = useCallback((message, type = 'info') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 4800);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...options, resolve });
  }), []);

  function closeDialog(result) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => {
          const Icon = TOAST_ICONS[item.type] || Info;
          return (
            <div key={item.id} className={`toast toast-${item.type}`}>
              <Icon size={19} />
              <span>{item.message}</span>
              <button type="button" aria-label="بستن" onClick={() => setToasts((p) => p.filter((t) => t.id !== item.id))}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
      {dialog && (
        <div className="modal-backdrop" onClick={() => closeDialog(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <span className={`dialog-icon ${dialog.danger ? 'danger' : ''}`}><AlertTriangle size={24} /></span>
            <h3>{dialog.title || 'تأیید عملیات'}</h3>
            <p>{dialog.message}</p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => closeDialog(false)}>
                {dialog.cancelText || 'انصراف'}
              </button>
              <button type="button" className={`btn ${dialog.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => closeDialog(true)} autoFocus>
                {dialog.confirmText || 'تأیید'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}
