const freeFeatures = [
  '完整浏览、搜索与公开社区内容',
  '收藏状态、观看进度与评分同步',
  '章节、评论、讨论版与好友动态',
  '多设备登录与会话管理',
];

export function PricingPage() {
  return (
    <section className="pricing-page section-pad">
      <div className="pricing-heading">
        <span className="eyebrow">免费使用 · 不限收藏</span>
        <h1>Kaku 当前完全免费。</h1>
        <p>
          浏览、收藏、进度、评分与社区功能不会按条目数量收费。Kaku
          目前没有付费版本，也没有支付入口。
        </p>
      </div>

      <div className="pricing-grid single">
        <article className="price-card">
          <div className="plan-top">
            <span className="plan-label">Kaku</span>
          </div>
          <h2>免费</h2>
          <p className="plan-copy">适合希望在手机上轻松使用 Bangumi 的每一位用户。</p>
          <div className="price">
            <strong>$0</strong>
            <span>当前全部功能</span>
          </div>
          <a className="button secondary full" href="/support">
            申请测试
          </a>
          <ul>
            {freeFeatures.map((feature) => (
              <li key={feature}>
                <span>✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="pricing-disclaimer">
        Kaku 仍处于开发测试阶段。测试资格、平台支持与功能可用性可能随开发进度调整。
      </p>

      <section className="faq-section">
        <div>
          <span className="eyebrow">常见问题</span>
          <h2>开始之前，可能想知道。</h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>Kaku 现在收费吗？</summary>
            <p>不收费。官网与 App 当前均不提供购买、订阅或赞助入口。</p>
          </details>
          <details>
            <summary>免费使用会限制收藏数量吗？</summary>
            <p>不会。浏览、收藏、进度、评分与社区阅读不按条目数量限制。</p>
          </details>
          <details>
            <summary>如何参与测试或反馈问题？</summary>
            <p>可通过支持页联系开发者，并附上设备、系统版本与复现步骤。</p>
          </details>
          <details>
            <summary>Kaku 是 Bangumi 官方产品吗？</summary>
            <p>Kaku 是独立开发的第三方客户端，与 Bangumi 番组计划没有隶属关系。</p>
          </details>
        </div>
      </section>
    </section>
  );
}
