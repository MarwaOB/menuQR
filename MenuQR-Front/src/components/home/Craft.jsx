import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SceneStage from '../3d/SceneStage';
import useScrollScene from '../../animation/useScrollScene';
import { gsap, ScrollTrigger } from '../../animation/gsap';
import { sceneStore } from '../3d/sceneStore';

const STEPS = [
  { title: 'home.craft.s1_title', text: 'home.craft.s1', explode: 1 },
  { title: 'home.craft.s2_title', text: 'home.craft.s2', explode: 0.45 },
  { title: 'home.craft.s3_title', text: 'home.craft.s3', explode: 0 },
];

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function setActive(steps, index) {
  steps.forEach((el, i) => el.toggleAttribute('data-active', i === index));
}

/**
 * Ingredients → preparation → service. On desktop the section pins and the
 * dish assembles itself as you scroll; elsewhere each step simply sets the
 * state of the dish when it scrolls into view.
 */
export default function Craft() {
  const { t } = useTranslation();
  const root = useRef(null);
  const pin = useRef(null);

  useScrollScene(root, ({ motion, desktop }, scope) => {
    const steps = gsap.utils.toArray('[data-step]', scope);
    const bar = scope.querySelector('[data-progress]');

    if (!motion) {
      sceneStore.explode = 0;
      steps.forEach((el) => el.setAttribute('data-active', ''));
      return;
    }

    if (desktop) {
      setActive(steps, 0);
      sceneStore.explode = 1;
      ScrollTrigger.create({
        trigger: pin.current,
        start: 'top top',
        end: '+=220%',
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          sceneStore.explode = 1 - smoothstep(0.18, 0.88, p);
          setActive(steps, Math.min(steps.length - 1, Math.floor(p * steps.length)));
          if (bar) bar.style.transform = `scaleY(${p})`;
        },
      });
      return;
    }

    sceneStore.explode = 1;
    steps.forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 65%',
        end: 'bottom 35%',
        onToggle: (self) => {
          if (!self.isActive) return;
          sceneStore.explode = STEPS[i].explode;
          setActive(steps, i);
        },
      });
    });
  });

  return (
    <section
      ref={root}
      id="craft"
      data-bg="var(--color-olive-deep)"
      data-tone="dark"
      className="relative text-paper"
    >
      <div ref={pin} className="relative lg:h-svh">
        <div className="mx-auto grid h-full max-w-[90rem] grid-cols-1 items-center gap-8 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-0">
          <div className="relative z-10 lg:col-span-5">
            <p className="eyebrow mb-5 flex items-center gap-3 text-saffron">
              <span className="h-px w-8 bg-current" aria-hidden="true" />
              {t('home.craft.eyebrow')}
            </p>
            <h2 className="font-display text-display-md font-light">{t('home.craft.title')}</h2>

            <SceneStage name="craft-mobile" tilt={0.7} explode className="mx-auto my-6 aspect-square w-full max-w-[24rem] lg:hidden" />

            <div className="relative mt-12 lg:mt-14 lg:ps-8">
              <span aria-hidden="true" className="absolute inset-y-0 hidden w-px bg-paper/15 lg:block ltr:left-0 rtl:right-0">
                <span data-progress className="block h-full w-full origin-top bg-saffron" style={{ transform: 'scaleY(0)' }} />
              </span>
              <ol className="space-y-6 lg:space-y-10">
                {STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    data-step
                    className="group/step opacity-40 transition-opacity duration-700 data-[active]:opacity-100 lg:min-h-0"
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-sm italic text-saffron">0{i + 1}</span>
                      <div>
                        <h3 className="font-display text-3xl sm:text-4xl">{t(step.title)}</h3>
                        <p className="mt-2 max-w-sm leading-relaxed text-paper/75">{t(step.text)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="relative hidden h-full lg:col-span-7 lg:block">
            <SceneStage
              name="craft"
              tilt={0.5}
              turn={0.4}
              explode
              className="absolute top-1/2 aspect-square w-[min(48vw,78vh)] -translate-y-1/2 ltr:right-0 rtl:left-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
