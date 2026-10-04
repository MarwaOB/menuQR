import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import Arrow from '../common/Arrow';
import LanguageToggle from '../common/LanguageToggle';
import { scrollToTarget } from '../../animation/smoothScroll';
import site from '../../data/site';

const LINKS = [
  { id: 'menu', label: 'home.nav.menu' },
  { id: 'story', label: 'home.nav.about' },
  { id: 'experience', label: 'home.nav.gallery' },
];

function Column({ title, children }) {
  return (
    <div>
      <h3 className="eyebrow mb-5 text-paper/50">{title}</h3>
      <div className="space-y-2.5 text-paper/85">{children}</div>
    </div>
  );
}

/** Footer & contact. Venue details render only when filled in data/site.js. */
export default function Footer() {
  const { t } = useTranslation();
  const { contact, hours, social } = site;
  const socials = Object.entries(social || {}).filter(([, url]) => url);
  const hasVisit = contact.address || hours.length;
  const hasContact = contact.phone || contact.email;

  return (
    <footer id="visit" data-bg="var(--color-char)" data-tone="dark" className="relative overflow-hidden text-paper">
      <div className="mx-auto max-w-[90rem] px-5 pb-28 pt-24 sm:px-8 sm:pb-10">
        <div className="grid grid-cols-1 gap-12 border-b border-paper/15 pb-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-display text-4xl font-light leading-tight sm:text-5xl">{t('home.footer.tagline')}</p>
            <Link to="/menu/order" className="btn btn-light mt-8">
              <span>{t('home.footer.order_online')}</span>
              <Arrow />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:col-span-1 lg:col-span-7 lg:grid-cols-4">
            <Column title={t('home.footer.explore')}>
              {LINKS.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToTarget(`#${l.id}`);
                  }}
                  className="link-underline block w-fit"
                >
                  {t(l.label)}
                </a>
              ))}
              <Link to="/menu/order" className="link-underline block w-fit">
                {t('home.nav.order')}
              </Link>
            </Column>

            <Column title={t('home.nav.order')}>
              <Link to="/menu/order?type=dine-in" className="link-underline block w-fit">
                {t('customer.dine_in')}
              </Link>
              <Link to="/menu/order?type=delivery" className="link-underline block w-fit">
                {t('customer.delivery')}
              </Link>
            </Column>

            {hasVisit ? (
              <Column title={t('home.footer.visit')}>
                {contact.address && <p className="leading-relaxed">{contact.address}</p>}
                {contact.mapUrl && (
                  <a href={contact.mapUrl} target="_blank" rel="noreferrer" className="link-underline block w-fit text-saffron">
                    {t('home.footer.directions')}
                  </a>
                )}
                {hours.map((h) => (
                  <p key={h.days} className="text-sm">
                    <span className="text-paper/60">{h.days}</span> · {h.time}
                  </p>
                ))}
              </Column>
            ) : null}

            {hasContact ? (
              <Column title={t('home.nav.contact')}>
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="link-underline block w-fit" dir="ltr">
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="link-underline block w-fit break-all">
                    {contact.email}
                  </a>
                )}
              </Column>
            ) : null}

            {socials.length ? (
              <Column title={t('home.footer.follow')}>
                {socials.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className="link-underline block w-fit capitalize">
                    {name}
                  </a>
                ))}
              </Column>
            ) : null}
          </div>
        </div>

        <p
          aria-hidden="true"
          className="select-none py-10 text-center font-display text-[clamp(4rem,17vw,16rem)] font-light italic leading-none tracking-tight text-paper/[0.92]"
        >
          {site.name}
        </p>

        <div className="flex flex-col-reverse items-start justify-between gap-6 border-t border-paper/15 pt-6 text-sm text-paper/60 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {site.name}. {t('home.footer.rights')}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="link-underline">
              {t('home.footer.staff')}
            </Link>
            <LanguageToggle className="hover:bg-paper/10" />
            <button
              type="button"
              onClick={() => scrollToTarget(0)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/25 transition-colors hover:bg-paper hover:text-char"
              aria-label={t('home.footer.top')}
            >
              <ArrowUp size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
