/**
 * Warm "sun" glow behind the hero dish. Lives beneath the WebGL canvas (the
 * hero copy sits above it), so it is rendered by the page, not the section.
 * Hero.jsx animates it via [data-hero-sun].
 */
export default function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-svh overflow-hidden">
      <div
        data-hero-sun
        className="absolute -end-[30vw] top-[22vh] h-[110vw] w-[110vw] rounded-full lg:-end-[10vw] lg:top-[4vh] lg:h-[62vw] lg:w-[62vw]"
        style={{ background: 'radial-gradient(circle at 50% 50%, #f1c98a 0%, #efd3ad 35%, rgba(243,236,224,0) 68%)' }}
      />
    </div>
  );
}
