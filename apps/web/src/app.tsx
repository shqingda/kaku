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

const PUBLIC_SITE_URL = 'https://kaku-web.shqingda.workers.dev';
const routeMetadata: Record<string, { description: string; title: string }> = {
  '/': {
    description:
      'Kaku 是一款为 iOS 与 Android 设计的 Bangumi 第三方客户端，轻松管理收藏、进度、评分与讨论。',
    title: 'Kaku · 你的动画与兴趣收藏盒',
  },
  '/pricing': {
    description: '了解 Kaku 当前的免费使用范围与测试状态。',
    title: '免费使用 · Kaku',
  },
  '/privacy': {
    description: '了解 Kaku 如何处理 Bangumi 授权、会话与个人数据。',
    title: '隐私政策 · Kaku',
  },
  '/support': {
    description: '查看 Kaku 的登录、同步与问题反馈方式。',
    title: '支持 · Kaku',
  },
  '/terms': {
    description: '查看 Kaku 的服务条款与第三方服务说明。',
    title: '服务条款 · Kaku',
  },
};

function setMetaContent(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

export function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  useEffect(() => {
    window.scrollTo(0, 0);
    const metadata = routeMetadata[path] ?? {
      description: '这个 Kaku 页面不存在，返回首页继续浏览。',
      title: '页面未找到 · Kaku',
    };
    const canonicalUrl = `${PUBLIC_SITE_URL}${path === '/' ? '/' : path}`;

    document.title = metadata.title;
    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute('href', canonicalUrl);
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
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
