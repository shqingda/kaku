import { useEffect } from 'react';

import { SiteFooter } from './components/site-footer';
import { SiteHeader } from './components/site-header';
import { HomePage } from './pages/home-page';
import { LegalPage } from './pages/legal-page';
import { NotFoundPage } from './pages/not-found-page';
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
    const titles: Record<string, string> = {
      '/': 'Kaku · 你的动画与兴趣收藏盒',
      '/pricing': '免费使用 · Kaku',
      '/privacy': '隐私政策 · Kaku',
      '/support': '支持 · Kaku',
      '/terms': '服务条款 · Kaku',
    };
    document.title = titles[path] ?? '页面未找到 · Kaku';
  }, [path]);

  let page = path === '/' ? <HomePage /> : <NotFoundPage />;

  if (path === '/pricing') {
    page = <PricingPage />;
  } else if (path === '/support') {
    page = <SupportPage />;
  } else if (path in legalPages) {
    page = <LegalPage type={legalPages[path as keyof typeof legalPages]} />;
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>{page}</main>
      <SiteFooter />
    </div>
  );
}
