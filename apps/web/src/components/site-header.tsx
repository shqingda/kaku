const navigation = [
  { href: '/#features', label: '功能' },
  { href: '/pricing', label: '免费' },
  { href: '/#privacy', label: '隐私' },
  { href: '/support', label: '支持' },
];

export function SiteHeader() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  return (
    <header className="site-header">
      <a aria-label="Kaku 首页" className="brand" href="/">
        <img alt="" aria-hidden="true" className="brand-mark" height="32" src="/kaku-icon.png" width="32" />
        <span>Kaku</span>
      </a>
      <nav aria-label="主导航" className="site-nav">
        {navigation.map((item) => (
          <a
            aria-current={item.href === currentPath ? 'page' : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <a className="nav-cta" href="/pricing">免费测试</a>
      <details className="mobile-menu">
        <summary>
          <span aria-hidden="true" className="menu-icon"><i /><i /><i /></span>
          <span className="visually-hidden">打开或关闭导航菜单</span>
        </summary>
        <nav aria-label="移动端导航">
          {navigation.map((item) => (
            <a
              aria-current={item.href === currentPath ? 'page' : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </details>
    </header>
  );
}
