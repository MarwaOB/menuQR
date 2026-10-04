'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * Accessible dialog: Escape and backdrop click close it, focus moves inside
 * on open and returns to the trigger on close, page scroll is locked.
 */
const Modal = ({ isOpen, onClose, children, labelledBy, size = 'md' }) => {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  // Callers pass inline handlers; keep the latest without re-running the effect
  // (which would steal focus on every parent render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector(
      'input, select, textarea, button:not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])'
    );
    (first || panelRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`animate-fade-in relative max-h-[90svh] w-full overflow-y-auto rounded-[1.5rem] border border-line bg-paper p-6 shadow-[0_30px_80px_-30px_rgb(27_22_17/0.5)] outline-none sm:p-8 ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <button
          type="button"
          data-modal-close
          onClick={onClose}
          className="absolute end-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label={t('dashboard.close')}
        >
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
