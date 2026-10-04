import { useTranslation } from 'react-i18next';

/**
 * Editorial page heading shared by the dashboard tabs: eyebrow with the
 * paprika rule (as on the home page), display title, one-line context and an
 * optional actions slot that wraps under the title on small screens.
 */
export default function PageHeader({ page, meta, actions }) {
  const { t } = useTranslation();

  return (
    <header className="mb-8 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="eyebrow mb-3 flex items-center gap-3 text-paprika">
          <span className="h-px w-8 bg-current" aria-hidden="true" />
          {t(`dashboard.pages.${page}.eyebrow`)}
        </p>
        <h1 className="font-display text-4xl font-light sm:text-5xl">
          {t(`dashboard.pages.${page}.title`)}
          {meta != null && (
            <span className="ms-3 align-middle font-sans text-sm font-medium text-muted tabular">{meta}</span>
          )}
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">{t(`dashboard.pages.${page}.subtitle`)}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
