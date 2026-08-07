const freeFeatures = ['完整浏览与搜索', '收藏、进度与评分同步', '章节与讨论浏览', '多设备登录管理'];
const proFeatures = ['免费版全部功能', '高级主题与 App 图标', '离线缓存与智能更新提醒', '支持独立开发持续维护'];
export function PricingPage() {
  return (
    <section className="pricing-page section-pad">
      <div className="pricing-heading">
        <span className="eyebrow">简单、透明、不自动续费</span>
        <h1>先好好用，再决定是否支持。</h1>
        <p>核心 Bangumi 客户端功能不会为了付费被故意拆碎。早期支持方案用于帮助 Kaku 完成测试、发布与持续维护。</p>
      </div>

      <div className="pricing-grid">
        <article className="price-card">
          <div className="plan-top"><span className="plan-label">Kaku</span></div>
          <h2>免费</h2>
          <p className="plan-copy">适合所有希望轻松使用 Bangumi 的用户。</p>
          <div className="price"><strong>$0</strong><span>一直免费</span></div>
          <a className="button secondary full" href="/support">申请测试</a>
          <ul>{freeFeatures.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        </article>
        <article className="price-card featured">
          <div className="plan-top"><span className="plan-label">Kaku Pro</span><span className="coming-badge">早期支持</span></div>
          <h2>支持 Kaku 继续开发</h2>
          <p className="plan-copy">支持独立开发，帮助 Kaku 完成测试、发布与持续维护。</p>
          <div className="price"><strong>$19.99</strong><span>一次性付费</span></div>
          <a className="button secondary full" href="/support">通过支持页联系</a>
          <ul>{proFeatures.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        </article>
      </div>

      <p className="pricing-disclaimer">Kaku Pro 仍在开发中，付费入口暂未开放。可通过支持页联系开发者。</p>

      <section className="faq-section">
        <div><span className="eyebrow">常见问题</span><h2>开始之前，可能想知道。</h2></div>
        <div className="faq-list">
          <details open><summary>免费版会限制收藏数量吗？</summary><p>不会。浏览、收藏、进度、评分与社区阅读属于客户端核心能力，不按条目数量收费。</p></details>
          <details><summary>Kaku Pro 什么时候开放？</summary><p>在 iOS 与 Android 的同步稳定性、隐私说明和支付合规全部验证完成后开放，不会为了上线日期牺牲可靠性。</p></details>
          <details><summary>如何联系开发者？</summary><p>可通过支持页填写反馈或疑问，开发者会尽快回复。</p></details>
          <details><summary>Kaku 是 Bangumi 官方产品吗？</summary><p>不是。Kaku 是独立开发的第三方客户端，通过 Bangumi 提供的接口与授权能力工作。</p></details>
        </div>
      </section>
    </section>
  );
}
