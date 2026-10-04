import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/navigation/Navbar';
import Loader from '../components/home/Loader';
import Hero from '../components/home/Hero';
import HeroBackdrop from '../components/home/HeroBackdrop';
import Marquee from '../components/home/Marquee';
import SignatureDish from '../components/home/SignatureDish';
import Story from '../components/home/Story';
import FeaturedMenu from '../components/home/FeaturedMenu';
import Craft from '../components/home/Craft';
import Experience from '../components/home/Experience';
import Gallery from '../components/home/Gallery';
import Reviews from '../components/home/Reviews';
import FinalCTA from '../components/home/FinalCTA';
import Footer from '../components/home/Footer';
import { SceneContext } from '../components/3d/sceneStore';
import { ScrollTrigger } from '../animation/gsap';
import { useSmoothScroll } from '../animation/smoothScroll';
import useCurrentMenu from '../hooks/useCurrentMenu';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { getDeviceTier } from '../lib/device';
import site from '../data/site';

// three.js + the scene are only fetched for the home page, in their own chunk.
const FoodScene = lazy(() => import('../components/3d/FoodScene'));

const INTRO_KEY = 'mq-intro-seen';

function shouldPlayIntro() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !sessionStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}

/**
 * Sections declare `data-bg` and `data-tone`; as each one crosses the middle
 * of the viewport the page background eases to its colour and the navbar
 * switches to light or dark.
 */
function useBackgroundDirector(rootRef, setTone, deps) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const triggers = Array.from(root.querySelectorAll('[data-bg]')).map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self) => {
          if (!self.isActive) return;
          root.style.setProperty('--home-bg', section.dataset.bg);
          setTone(section.dataset.tone || 'light');
        },
      })
    );
    return () => triggers.forEach((t) => t.kill());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const root = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const tier = useMemo(() => getDeviceTier(), []);
  const webgl = tier !== 'low';
  const [playIntro] = useState(shouldPlayIntro);
  const [introDone, setIntroDone] = useState(!playIntro);
  const [tone, setTone] = useState('light');
  const { status, menu, dishes, reload } = useCurrentMenu();

  useSmoothScroll(true);
  useBackgroundDirector(root, setTone, [status, dishes.length]);

  useEffect(() => {
    document.title = `${site.name} — ${t('home.footer.tagline')}`;
  }, [t, i18n.language]);

  // Content height changes when the menu arrives / fonts swap: re-measure triggers.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [status, i18n.language]);
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  const finishIntro = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* storage unavailable — intro may replay, that's fine */
    }
    setIntroDone(true);
  };

  return (
    <SceneContext.Provider value={{ webgl }}>
      <div
        ref={root}
        className="grain relative min-h-svh overflow-x-clip text-ink transition-[background-color] duration-700 ease-out"
        style={{ backgroundColor: 'var(--home-bg, var(--color-cream))' }}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-paper"
        >
          {t('home.nav.skip')}
        </a>

        {playIntro && !introDone && <Loader onDone={finishIntro} />}

        <HeroBackdrop />

        {webgl && (
          <Suspense fallback={null}>
            <FoodScene tier={tier} reducedMotion={reducedMotion} />
          </Suspense>
        )}

        <Navbar tone={tone} />

        <main id="main" className="relative z-10">
          <Hero ready={introDone} menu={menu} />
          <Marquee
            className="border-y border-line py-5 font-display text-2xl italic text-ink-soft sm:text-3xl"
            items={[t('home.story.l1'), t('home.story.l2'), t('home.story.l3'), t('home.hero.today')]}
          />
          <SignatureDish dishes={dishes} status={status} />
          <Story />
          <FeaturedMenu dishes={dishes} status={status} onRetry={reload} />
          <Craft />
          <Experience />
          <Gallery dishes={dishes} />
          <Reviews />
          <FinalCTA />
        </main>
        <div className="relative z-10">
          <Footer />
        </div>
      </div>
    </SceneContext.Provider>
  );
}
