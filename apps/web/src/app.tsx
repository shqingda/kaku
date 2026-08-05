import { useEffect } from 'react';

import { SiteFooter } from './components/site-footer';
import { SiteHeader } from './components/site-header';
import { HomePage } from './pages/home-page';
import { LegalPage } from './pages/legal-page';
import { PricingPage } from './pages/pricing-page';
import { SupportPage } from './pages/support-page';

const legalPages = {
  '/privacy': 'privacy',
  '/terms': 'terms',
} as const;

export function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  let page = <HomePage />;

  if (path === '/pricing') {
    page = <PricingPage />;
  } else if (path === '/support') {
    page = <SupportPage />;
  } else if (path in legalPages) {
    page = <LegalPage type={legalPages[path as keyof typeof legalPages]} />;
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>{page}</main>
      <SiteFooter />
    </div>
  );
}
