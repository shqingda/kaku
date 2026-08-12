export function SupportPage() {
  return (
    <section className="support-page section-pad">
      <div className="support-heading"><span className="eyebrow">Support</span><h1>需要帮忙？</h1><p>如果登录、同步或页面显示遇到问题，请带上设备型号、系统版本与复现步骤联系开发者。</p></div>
      <div className="support-grid">
        <article><span>01</span><h2>登录与同步</h2><p>先确认 Bangumi 可以正常访问，再在账户页重试。Kaku 不会用空白页面隐藏网络失败。</p></article>
        <article><span>02</span><h2>问题反馈</h2><p>通过开发者主页发起联系。请不要在公开内容中提交 access token、Session 或其他私密凭据。</p><a href="https://github.com/shqingda" rel="noreferrer" target="_blank">联系开发者 <span aria-hidden="true">→</span><span className="visually-hidden">（在新窗口打开）</span></a></article>
        <article><span>03</span><h2>项目与合作</h2><p>应用商店、内容授权、兼容性与其他项目合作，也可通过开发者主页联系。</p></article>
      </div>
      <div className="support-status"><span aria-hidden="true" className="status-dot" /><div><strong>服务状态</strong><p>Kaku API 当前已部署运行。若 Bangumi 网络波动，客户端会提供重试提示。</p></div></div>
    </section>
  );
}
