'use client';

export default function MyButton({ children, className = '', ...props }) {
  return (
    <button
      className={`
         active:scale-95 font-semibold py-2 px-5 rounded-xl 
        shadow-md hover:shadow-lg transition-all duration-200 ease-in-out
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
