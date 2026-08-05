import { useState } from 'react';

const freeFeatures = ['完整浏览与搜索', '收藏、进度与评分同步', '章节与讨论浏览', '多设备登录管理'];
const proFeatures = ['免费版全部功能', '高级主题与 App 图标', '离线缓存与智能更新提醒', '支持独立开发持续维护'];

export function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const price = billing === 'yearly' ? '$24.99' : '$2.99';
  const suffix = billing === 'yearly' ? '/ 年' : '/ 月';

  return (
    <section className="pricing-page section-pad">
      <div className="pricing-heading">
        <span className="eyebrow">简单、透明、没有倒计时</span>
        <h1>先好好用，再决定是否支持。</h1>
        <p>核心 Bangumi 客户端功能不会为了订阅被故意拆碎。Pro 用来支持更重的体验与长期独立开发。</p>
        <div className="billing-toggle" aria-label="计费周期">
          <button className={billing === 'monthly' ? 'selected' : ''} onClick={() => setBilling('monthly')}>月付</button>
          <button className={billing === 'yearly' ? 'selected' : ''} onClick={() => setBilling('yearly')}>年付 <span>省 30%</span></button>
        </div>
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
          <div className="plan-top"><span className="plan-label">Kaku Pro</span><span className="coming-badge">计划中</span></div>
          <h2>为每天使用的人</h2>
          <p className="plan-copy">更个性、更安静，并帮助 Kaku 长期维护。</p>
          <div className="price"><strong>{price}</strong><span>{suffix}</span></div>
          <a className="button primary full" href="/support">加入候补名单</a>
          <ul>{proFeatures.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        </article>
      </div>

      <p className="pricing-disclaimer">Pro 尚未开放购买，页面价格为计划价格，正式发布前可能调整。当前测试版不会向用户收费。</p>

      <section className="faq-section">
        <div><span className="eyebrow">常见问题</span><h2>开始之前，可能想知道。</h2></div>
        <div className="faq-list">
          <details open><summary>免费版会限制收藏数量吗？</summary><p>不会。浏览、收藏、进度、评分与社区阅读属于客户端核心能力，不按条目数量收费。</p></details>
          <details><summary>Kaku Pro 什么时候开放？</summary><p>在 iOS 与 Android 的同步稳定性、隐私说明和支付合规全部验证完成后开放，不会为了上线日期牺牲可靠性。</p></details>
          <details><summary>现在可以通过 PayPal 购买吗？</summary><p>暂时不可以。PayPal 支付将在正式商业版本准备好后接入；目前不会收取订阅费用。</p></details>
          <details><summary>Kaku 是 Bangumi 官方产品吗？</summary><p>不是。Kaku 是独立开发的第三方客户端，通过 Bangumi 提供的接口与授权能力工作。</p></details>
        </div>
      </section>
    </section>
  );
}
