import { Minus, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * − qty + control. At quantity 1 the minus becomes a bin (removes the item),
 * matching the previous behaviour of decrementing to zero.
 */
export default function QuantityStepper({ name, quantity, onChange, size = 'md', tone = 'dark' }) {
  const { t } = useTranslation();
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const shell =
    tone === 'dark' ? 'bg-ink text-paper' : 'bg-paper text-ink ring-1 ring-line';
  const btn = tone === 'dark' ? 'hover:bg-paper/15' : 'hover:bg-ink/5';
  const q = parseInt(quantity) || 0;

  return (
    <div className={`inline-flex items-center rounded-full ${shell}`}>
      <button
        type="button"
        onClick={() => onChange(q - 1)}
        className={`flex ${dims} items-center justify-center rounded-full transition-colors ${btn}`}
        aria-label={q <= 1 ? t('order.remove_named', { name }) : t('order.decrease', { name })}
      >
        {q <= 1 ? <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" /> : <Minus size={15} strokeWidth={2} aria-hidden="true" />}
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite" aria-label={`${t('order.quantity')}: ${q}`}>
        {q}
      </span>
      <button
        type="button"
        onClick={() => onChange(q + 1)}
        className={`flex ${dims} items-center justify-center rounded-full transition-colors ${btn}`}
        aria-label={t('order.increase', { name })}
      >
        <Plus size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
