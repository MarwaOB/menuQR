/** Infinite ticker of short phrases. Pure CSS; stops under reduced motion. */
export default function Marquee({ items, className = '', separator = '✦' }) {
  const row = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center">
          <span className="px-6 sm:px-10">{item}</span>
          <span className="text-[0.5em] opacity-60" aria-hidden="true">
            {separator}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`} dir="ltr">
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
