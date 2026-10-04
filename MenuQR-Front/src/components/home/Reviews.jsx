import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import site from '../../data/site';

function Stars({ rating = 5 }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 text-saffron" role="img" aria-label={t('home.reviews.rating', { n: rating })}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={18} strokeWidth={1.5} fill={i < Math.round(rating) ? 'currentColor' : 'none'} aria-hidden="true" />
      ))}
    </div>
  );
}

/**
 * Testimonials carousel. Reads genuine reviews from `site.reviews`;
 * renders nothing while that list is empty.
 */
export default function Reviews({ reviews = site.reviews }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  if (!reviews.length) return null;

  const count = reviews.length;
  const go = (delta) => setIndex((i) => (i + delta + count) % count);
  const review = reviews[index];

  return (
    <section
      data-bg="var(--color-paper)"
      data-tone="light"
      className="relative py-24 text-ink sm:py-32"
      aria-roledescription="carousel"
      aria-labelledby="reviews-title"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(document.documentElement.dir === 'rtl' ? -1 : 1);
        if (e.key === 'ArrowLeft') go(document.documentElement.dir === 'rtl' ? 1 : -1);
      }}
    >
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-5 text-paprika">{t('home.reviews.eyebrow')}</p>
            <h2 id="reviews-title" className="font-display text-display-md font-light">
              {t('home.reviews.title')}
            </h2>
          </div>

          <div className="lg:col-span-8">
            <figure key={index} aria-live="polite" className="motion-safe:animate-[fadeIn_0.7s_var(--ease-out-expo)]">
              <Stars rating={review.rating} />
              <blockquote className="mt-6 font-display text-3xl font-light leading-snug sm:text-4xl">
                “{review.text}”
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                {review.avatar && <img src={review.avatar} alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />}
                <span>
                  <span className="block font-medium">{review.name}</span>
                  {review.source && <span className="text-sm text-muted">{review.source}</span>}
                </span>
              </figcaption>
            </figure>

            {count > 1 && (
              <div className="mt-12 flex items-center gap-4">
                <button type="button" onClick={() => go(-1)} className="flex h-12 w-12 items-center justify-center rounded-full border border-line transition-colors hover:bg-ink hover:text-paper" aria-label={t('home.reviews.prev')}>
                  <ArrowLeft size={18} strokeWidth={1.5} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => go(1)} className="flex h-12 w-12 items-center justify-center rounded-full border border-line transition-colors hover:bg-ink hover:text-paper" aria-label={t('home.reviews.next')}>
                  <ArrowRight size={18} strokeWidth={1.5} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                <span className="text-sm tabular-nums text-muted">{t('home.reviews.of', { current: index + 1, total: count })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
