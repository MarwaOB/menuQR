'use client';

/**
 * Legacy admin button. Colour comes from the caller's classes (or a `.btn-*`
 * variant); this only sets the shared pill shape, size and feedback.
 */
export default function MyButton({ children, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
