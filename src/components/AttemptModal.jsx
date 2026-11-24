import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X, MinusCircle } from 'lucide-react';
import { QUESTION_TYPE_LABELS, fa, faDate, percentOf } from '../utils.js';

export default function AttemptModal({ attempt, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const details = attempt.details || [];
  const correct = details.filter((d) => d.isCorrect).length;
  const percent = Math.round(percentOf(attempt));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{attempt.test_title}</h3>
            <p className="muted">{attempt.username} · {faDate(attempt.created_at)}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="بستن"><X size={20} /></button>
        </div>

        <div className="result-summary">
          <div className={`score-ring ${attempt.passed ? 'pass' : 'fail'}`} style={{ '--p': percent }}>
            <div><b>{fa(attempt.score)}</b><small>از {fa(attempt.max_score)}</small></div>
          </div>
          <div className="result-facts">
            <span className={`status-badge ${attempt.passed ? 'pass' : 'fail'}`}>
              {attempt.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{attempt.passed ? 'قبول' : 'مردود'}
            </span>
            <span><b>{fa(correct)}</b> پاسخ صحیح از <b>{fa(details.length)}</b> سؤال</span>
            <span>حد نصاب قبولی: <b>{fa(attempt.pass_score)}</b></span>
          </div>
        </div>

        <div className="modal-scroll">
          {details.map((item, idx) => {
            const isMultiple = item.type === 'multiple_choice';
            const unanswered = isMultiple ? !(item.selectedIndices || []).length : item.selectedIndex === -1;
            return (
              <section key={idx} className={`review-card ${item.isCorrect ? 'ok' : 'bad'}`}>
                <header>
                  <span className="q-number">{fa(idx + 1)}</span>
                  <span className="type-badge">{QUESTION_TYPE_LABELS[item.type] || 'تک‌پاسخی'} · ضریب {fa(item.weight ?? 1)}</span>
                  <span className={`verdict ${item.isCorrect ? 'ok' : 'bad'}`}>
                    {item.isCorrect ? <CheckCircle2 size={16} /> : unanswered ? <MinusCircle size={16} /> : <XCircle size={16} />}
                    {item.isCorrect ? 'صحیح' : unanswered ? 'بی‌پاسخ' : 'نادرست'}
                  </span>
                </header>
                <p className="q-text">{item.questionText}</p>
                <div className="options">
                  {item.options.map((opt, oi) => {
                    const isCorrect = isMultiple ? (item.correctIndices || []).includes(oi) : oi === item.correctIndex;
                    const isSelected = isMultiple ? (item.selectedIndices || []).includes(oi) : oi === item.selectedIndex;
                    const cls = isCorrect ? 'correct' : isSelected ? 'wrong' : '';
                    return (
                      <div key={oi} className={`option static ${cls}`}>
                        <span className="option-mark">{isCorrect ? '✓' : isSelected ? '✕' : fa(oi + 1)}</span>
                        <span className="option-text">{opt}</span>
                        {isCorrect && <em>پاسخ صحیح</em>}
                        {isSelected && !isCorrect && <em>انتخاب شما</em>}
                      </div>
                    );
                  })}
                </div>
                {item.explanation && <div className="explanation"><b>توضیح پاسخ:</b> {item.explanation}</div>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
