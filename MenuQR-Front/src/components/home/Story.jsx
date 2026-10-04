import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useScrollScene, { revealChildren } from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';

const PILLARS = [
  { title: 'home.story.p1_title', text: 'home.story.p1' },
  { title: 'home.story.p2_title', text: 'home.story.p2' },
  { title: 'home.story.p3_title', text: 'home.story.p3' },
];

/** Splits a line into word spans for scroll-scrubbed highlighting. */
function Words({ text, className = '' }) {
  return (
    <span className={`block ${className}`}>
      {text.split(' ').map((word, i) => (
        <span key={i} data-word className="inline-block">
          {word}
          {' '}
        </span>
      ))}
    </span>
  );
}

export default function Story() {
  const { t, i18n } = useTranslation();
  const root = useRef(null);

  useScrollScene(
    root,
    ({ motion }, scope) => {
      if (!motion) return;
      revealChildren(scope);
      gsap.fromTo(
        '[data-word]',
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: '[data-statement]', start: 'top 78%', end: 'bottom 45%', scrub: true },
        }
      );
      gsap.fromTo(
        '[data-story-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '[data-story-rule]', start: 'top 90%', once: true } }
      );
    },
    [i18n.language]
  );

  return (
    <section
      ref={root}
      id="story"
      data-bg="var(--color-paper)"
      data-tone="light"
      className="relative py-24 text-ink sm:py-32 lg:py-44"
    >
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <p data-reveal className="eyebrow flex items-center gap-3 text-paprika lg:col-span-3 lg:pt-6">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {t('home.story.eyebrow')}
          </p>

          <h2 data-statement className="font-display text-display-lg font-light lg:col-span-9">
            <Words text={t('home.story.l1')} />
            <Words text={t('home.story.l2')} className="italic text-paprika" />
            <Words text={t('home.story.l3')} />
          </h2>
        </div>

        <div data-story-rule className="mt-20 h-px origin-left bg-line rtl:origin-right lg:mt-28" aria-hidden="true" />

        <ol className="grid grid-cols-1 gap-12 pt-12 sm:grid-cols-3 sm:gap-8">
          {PILLARS.map((p, i) => (
            <li key={p.title} data-reveal={i} className="max-w-sm">
              <span className="font-display text-sm italic text-paprika">0{i + 1}</span>
              <h3 className="mt-3 font-display text-2xl">{t(p.title)}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{t(p.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
