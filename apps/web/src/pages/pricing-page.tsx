const freeFeatures = ['完整浏览与搜索', '收藏、进度与评分同步', '章节与讨论浏览', '多设备登录管理'];
const proFeatures = ['免费版全部功能', '高级主题与 App 图标', '离线缓存与智能更新提醒', '支持独立开发持续维护'];
const paypalPaymentUrl = 'https://www.paypal.com/ncp/payment/VE8Z4TF52MYHG';

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
          <span className="plan-label">Kaku</span>
          <h2>免费</h2>
          <p className="plan-copy">适合所有希望轻松使用 Bangumi 的用户。</p>
          <div className="price"><strong>$0</strong><span>一直免费</span></div>
          <a className="button secondary full" href="/support">申请测试</a>
          <ul>{freeFeatures.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        </article>
        <article className="price-card featured">
          <div className="plan-top"><span className="plan-label">Kaku Pro</span><span className="coming-badge">早期支持</span></div>
          <h2>支持 Kaku 继续开发</h2>
          <p className="plan-copy">一次性购买早期支持资格；Kaku Pro 开放后，可凭 PayPal 订单号领取对应权益。</p>
          <div className="price"><strong>$2.99</strong><span>一次性付款</span></div>
          <a
            className="button paypal-button full"
            href={paypalPaymentUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span className="paypal-wordmark" aria-hidden="true">PayPal</span>
            <span>安全付款</span>
          </a>
          <p className="payment-note">跳转至 PayPal 完成支付 · 不自动续费</p>
          <ul>{proFeatures.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        </article>
      </div>

      <p className="pricing-disclaimer">Kaku Pro 仍在开发中。付款后请保留 PayPal 订单收据；正式开放前如不希望继续等待，可通过支持页面联系退款。</p>

      <section className="faq-section">
        <div><span className="eyebrow">常见问题</span><h2>开始之前，可能想知道。</h2></div>
        <div className="faq-list">
          <details open><summary>免费版会限制收藏数量吗？</summary><p>不会。浏览、收藏、进度、评分与社区阅读属于客户端核心能力，不按条目数量收费。</p></details>
          <details><summary>Kaku Pro 什么时候开放？</summary><p>在 iOS 与 Android 的同步稳定性、隐私说明和支付合规全部验证完成后开放，不会为了上线日期牺牲可靠性。</p></details>
          <details><summary>PayPal 付款会自动续费吗？</summary><p>不会。当前早期支持方案为 2.99 美元一次性付款，由 PayPal 安全处理；Kaku 不接触你的银行卡或 PayPal 密码。</p></details>
          <details><summary>付款后如何领取？</summary><p>PayPal 会即时生成订单收据。请保留订单号，Kaku Pro 正式开放后可用它领取早期支持权益；在此之前如需退款，可通过支持页面联系开发者。</p></details>
          <details><summary>Kaku 是 Bangumi 官方产品吗？</summary><p>不是。Kaku 是独立开发的第三方客户端，通过 Bangumi 提供的接口与授权能力工作。</p></details>
        </div>
      </section>
    </section>
  );
}
