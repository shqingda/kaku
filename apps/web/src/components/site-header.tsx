const navigation = [
  { href: '/#features', label: '功能' },
  { href: '/pricing', label: '免费' },
  { href: '/#privacy', label: '隐私' },
  { href: '/support', label: '支持' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <a aria-label="Kaku 首页" className="brand" href="/">
        <img alt="" aria-hidden="true" className="brand-mark" src="/kaku-icon.png" />
        <span>Kaku</span>
      </a>
      <nav aria-label="主导航" className="site-nav">
        {navigation.map((item) => (
          <a href={item.href} key={item.href}>{item.label}</a>
        ))}
      </nav>
      <a className="nav-cta" href="/pricing">免费测试</a>
    </header>
  );
}
