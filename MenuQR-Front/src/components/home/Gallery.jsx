import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useScrollScene from '../../animation/useScrollScene';
import { gsap } from '../../animation/gsap';
import { dishImage } from '../../lib/menu';
import site from '../../data/site';

/** Real venue photos from site.js, otherwise dish photos from today's menu. */
function getGalleryImages(dishes) {
  if (site.gallery.length) return site.gallery;
  return dishes
    .filter((d) => dishImage(d))
    .slice(0, 6)
    .map((d) => ({ src: dishImage(d), alt: d.name, caption: d.name }));
}

/**
 * Cinematic gallery. Desktop: the section pins and the strip travels
 * horizontally. Mobile: native swipeable strip. Hidden with < 3 photos.
 */
export default function Gallery({ dishes }) {
  const { t } = useTranslation();
  const root = useRef(null);
  const track = useRef(null);
  const images = getGalleryImages(dishes);

  useScrollScene(
    root,
    ({ motion, desktop }, scope) => {
      if (!motion || !track.current) return;
      const frames = gsap.utils.toArray('[data-frame]', scope);
      if (desktop) {
        const rtl = document.documentElement.dir === 'rtl';
        const distance = () => Math.max(0, track.current.scrollWidth - window.innerWidth);
        const tween = gsap.to(track.current, {
          x: () => (rtl ? distance() : -distance()),
          ease: 'none',
          scrollTrigger: {
            trigger: scope.querySelector('[data-gallery-pin]'),
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        frames.forEach((frame) => {
          gsap.fromTo(
            frame.querySelector('img'),
            { scale: 1.25 },
            { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }
          );
        });
      } else {
        frames.forEach((frame) => {
          gsap.fromTo(
            frame,
            { clipPath: 'inset(0 0 100% 0)' },
            { clipPath: 'inset(0 0 0% 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: frame, start: 'top 90%', once: true } }
          );
        });
      }
    },
    [images.length]
  );

  if (images.length < 3) return null;

  return (
    <section ref={root} data-bg="var(--color-char)" data-tone="dark" className="relative text-paper" aria-labelledby="gallery-title">
      <div data-gallery-pin className="flex flex-col justify-center overflow-hidden py-24 lg:h-svh lg:py-0">
        <div className="mx-auto mb-10 w-full max-w-[90rem] px-5 sm:px-8">
          <p className="eyebrow mb-4 text-saffron">{t('home.gallery.eyebrow')}</p>
          <h2 id="gallery-title" className="font-display text-display-md font-light">
            {t('home.gallery.title')}
          </h2>
        </div>
        <ul
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8 lg:w-max lg:snap-none lg:gap-8 lg:overflow-visible"
        >
          {images.map((img, i) => (
            <li
              key={img.src + i}
              data-frame
              className={`relative shrink-0 snap-center overflow-hidden rounded-[1.5rem] bg-ink-soft ${
                i % 3 === 0 ? 'h-[60vh] w-[80vw] lg:h-[62vh] lg:w-[44vw]' : 'h-[48vh] w-[66vw] lg:mt-[10vh] lg:h-[50vh] lg:w-[28vw]'
              }`}
            >
              <img src={img.src} alt={img.alt || ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              {img.caption && (
                <span className="absolute bottom-4 rounded-full bg-char/60 px-3 py-1 text-xs backdrop-blur ltr:left-4 rtl:right-4">
                  {img.caption}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
