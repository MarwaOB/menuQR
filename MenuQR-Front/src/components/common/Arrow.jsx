import { ArrowRight, ArrowUpRight } from 'lucide-react';

/** Arrow that slides out/in when its parent link or button is hovered. */
export default function Arrow({ diagonal = false, size = 16 }) {
  const Icon = diagonal ? ArrowUpRight : ArrowRight;
  return (
    <span className="arrow-slide" aria-hidden="true">
      <Icon size={size} strokeWidth={1.75} />
      <Icon size={size} strokeWidth={1.75} />
    </span>
  );
}
