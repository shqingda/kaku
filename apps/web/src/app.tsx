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
const retiredPaths: Record<string, { hash?: string; path: '/' }> = {
  '/pricing': { path: '/' },
  '/support': { hash: 'faq', path: '/' },
};

function getRetiredPath(path: string) {
  if (path === '/pricing' || path === '/support') {
    return retiredPaths[path];
  }
  return undefined;
}

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
  const rawPath = window.location.pathname.replace(/\/$/, '') || '/';
  const retired = getRetiredPath(rawPath);
  const path = retired?.path ?? rawPath;

  useEffect(() => {
    if (!retired) {
      window.scrollTo(0, 0);
      return;
    }

    const nextUrl = retired.hash ? `${retired.path}#${retired.hash}` : retired.path;
    window.history.replaceState(null, '', nextUrl);
    if (retired.hash) {
      document.getElementById(retired.hash)?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [rawPath, retired]);

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
