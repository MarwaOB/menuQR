/**
 * Static, lightweight stand-in for the 3D dish on devices without WebGL or in
 * data-saver mode. Same composition, drawn in SVG.
 */
export default function PlateIllustration({ className = '' }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="presentation">
      <defs>
        <radialGradient id="pi-plate" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="0.75" stopColor="#f1e9dc" />
          <stop offset="1" stopColor="#ddd0bd" />
        </radialGradient>
        <radialGradient id="pi-sauce" cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#c8492a" />
          <stop offset="1" stopColor="#8f2814" />
        </radialGradient>
        <radialGradient id="pi-tomato" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ef5a3f" />
          <stop offset="1" stopColor="#a5170d" />
        </radialGradient>
        <radialGradient id="pi-burrata" cx="40%" cy="35%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e7ddcd" />
        </radialGradient>
        <filter id="pi-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#5b3a2e" floodOpacity="0.25" />
        </filter>
      </defs>
      <ellipse cx="200" cy="212" rx="170" ry="170" fill="url(#pi-plate)" filter="url(#pi-shadow)" />
      <circle cx="200" cy="208" r="160" fill="none" stroke="#b5401f" strokeWidth="1.5" opacity="0.7" />
      <circle cx="200" cy="208" r="118" fill="#efe6d8" />
      <path
        d="M200 112c40 0 92 22 96 70s-18 106-72 116-112-8-122-60 38-126 98-126z"
        fill="url(#pi-sauce)"
      />
      <path d="M140 230c30 18 80 26 120-6" stroke="#d8b13a" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />
      <circle cx="198" cy="200" r="46" fill="url(#pi-burrata)" />
      <circle cx="262" cy="170" r="17" fill="url(#pi-tomato)" />
      <circle cx="142" cy="178" r="15" fill="url(#pi-tomato)" />
      <circle cx="238" cy="258" r="16" fill="url(#pi-tomato)" />
      <circle cx="160" cy="262" r="14" fill="#e2553a" />
      <circle cx="160" cy="262" r="7" fill="#f3936a" />
      <path d="M220 150c18-22 46-20 52-14-8 16-30 26-52 14z" fill="#3e6b2a" />
      <path d="M150 220c-26-4-38-26-36-34 18-2 36 12 36 34z" fill="#4a7a32" />
      <path d="M250 222c22 6 30 28 26 34-18 0-30-14-26-34z" fill="#3e6b2a" />
      {[
        [182, 150], [252, 210], [130, 210], [214, 284], [180, 300], [270, 240], [150, 148],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#2a1f18" />
      ))}
    </svg>
  );
}
