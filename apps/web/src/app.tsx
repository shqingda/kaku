import { useEffect } from 'react';

import { SiteFooter } from './components/site-footer';
import { SiteHeader } from './components/site-header';
import { I18nProvider, useI18n } from './i18n';
import { HomePage } from './pages/home-page';
import { LegalPage } from './pages/legal-page';
import { NotFoundPage } from './pages/not-found-page';

const PUBLIC_SITE_URL = 'https://kaku-web.shqingda.workers.dev';
const legalPages = {
  '/privacy': 'privacy',
  '/terms': 'terms',
} as const;

function setMetaContent(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

function PageMetadata({ path }: { path: string }) {
  const { t } = useI18n();

  useEffect(() => {
    const metadata =
      path === '/'
        ? t.meta.home
        : path in legalPages
          ? t.meta[legalPages[path as keyof typeof legalPages]]
          : t.meta.notFound;
    const canonicalUrl = `${PUBLIC_SITE_URL}${path === '/' ? '/' : path}`;

    document.title = metadata.title;
    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute('href', canonicalUrl);
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
  }, [path, t]);

  return null;
}

function Site() {
  const { t } = useI18n();
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  let page = path === '/' ? <HomePage /> : <NotFoundPage />;

  if (path in legalPages) {
    page = <LegalPage type={legalPages[path as keyof typeof legalPages]} />;
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">{t.skipLink}</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>{page}</main>
      <SiteFooter />
      <PageMetadata path={path} />
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <Site />
    </I18nProvider>
  );
}
