const navigation = [
  { href: '/#features', label: '功能' },
  { href: '/pricing', label: '定价' },
  { href: '/#privacy', label: '隐私' },
  { href: '/support', label: '支持' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <a aria-label="Kaku 首页" className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">K</span>
        <span>Kaku</span>
      </a>
      <nav aria-label="主导航" className="site-nav">
        {navigation.map((item) => (
          <a href={item.href} key={item.href}>{item.label}</a>
        ))}
      </nav>
      <a className="nav-cta" href="/pricing">查看计划</a>
    </header>
  );
}
