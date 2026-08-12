export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img alt="" aria-hidden="true" className="brand-mark small" height="28" src="/kaku-icon.png" width="28" />
        <div>
          <strong>Kaku</strong>
          <p>为喜欢的作品，留一个安静的位置。</p>
        </div>
      </div>
      <div className="footer-links">
        <a href="/pricing">免费使用</a>
        <a href="/privacy">隐私政策</a>
        <a href="/terms">服务条款</a>
        <a href="/support">支持</a>
        <a href="https://github.com/shqingda" rel="noreferrer" target="_blank">
          开发者<span className="visually-hidden">（在新窗口打开）</span>
        </a>
      </div>
      <p className="footer-note">
        © {new Date().getFullYear()} Kaku · 独立开发产品。Kaku 与 Bangumi 番组计划无隶属关系。
      </p>
    </footer>
  );
}
