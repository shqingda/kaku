import { ProductPreview } from '../components/product-preview';

const features = [
  {
    icon: '⌁',
    title: '收藏，进度与评分',
    copy: '想看、在看、看过、搁置与抛弃完整对应 Bangumi。每次更新都同步到你的真实账户。',
  },
  {
    icon: '▦',
    title: '章节不再是表格',
    copy: '格子与列表两种视图，长篇作品自动分段。点进每一集，都能继续读讨论。',
  },
  {
    icon: '◌',
    title: '讨论仍然属于社区',
    copy: '吐槽箱、评论、讨论版与回复关系保持原意，用更适合手机的方式呈现。',
  },
];

export function HomePage() {
  return (
    <>
      <section className="hero section-pad">
        <div className="hero-copy">
          <div className="pill"><span /> iOS 与 Android 测试中</div>
          <h1>把每一部喜欢，<br /><em>留在一个安静的地方。</em></h1>
          <p>Kaku 是一个为移动端重新设计的 Bangumi 第三方客户端。收藏、追踪、评分与讨论，都更轻、更快，也更像原生 App。</p>
          <div className="hero-actions">
            <a className="button primary" href="/pricing">免费测试</a>
            <a className="button secondary" href="#features">了解 Kaku <span>↓</span></a>
          </div>
          <div className="platform-note"><span>●</span> iPhone · Android · macOS 计划中</div>
        </div>
        <ProductPreview />
      </section>

      <section className="trust-strip" aria-label="产品特点">
        <span>真实 Bangumi 数据</span><i />
        <span>系统浏览器授权</span><i />
        <span>跨设备登录</span><i />
        <span>独立开发</span>
      </section>

      <section className="feature-section section-pad" id="features">
        <div className="section-heading">
          <span className="eyebrow">熟悉，但更顺手</span>
          <h2>少一点操作，<br />多一点作品本身。</h2>
          <p>功能尊重 Bangumi 原版，交互则从移动端重新思考。没有为了“粘性”制造的负担。</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sync-section section-pad">
        <div className="sync-card">
          <div className="sync-copy">
            <span className="eyebrow">一个账户，多台设备</span>
            <h2>换一块屏幕，<br />不用重新开始。</h2>
            <p>使用 Bangumi 官方授权登录。密码不会经过 Kaku；收藏、进度与评分直接同步到你的 Bangumi 账户。</p>
            <a className="text-link" href="/privacy">了解隐私设计 <span>→</span></a>
          </div>
          <div className="sync-visual" aria-hidden="true">
            <div className="device-card device-ios"><b>iPhone</b><span>刚刚同步</span><i>17 / 28</i></div>
            <div className="sync-orbit"><span>↻</span></div>
            <div className="device-card device-android"><b>Android</b><span>在线</span><i>17 / 28</i></div>
          </div>
        </div>
      </section>

      <section className="privacy-section section-pad" id="privacy">
        <div className="privacy-mark">⌁</div>
        <span className="eyebrow">隐私不是附加功能</span>
        <h2>你的密码，从不交给 Kaku。</h2>
        <p>登录在系统浏览器与 Bangumi 官方页面完成。Kaku 只保存完成同步所需的加密授权凭据，并允许你随时断开全部设备。</p>
        <div className="privacy-points"><span>不保存 Bangumi 密码</span><span>令牌加密存储</span><span>可撤销设备会话</span></div>
      </section>

      <section className="closing-section section-pad">
        <div>
          <span className="eyebrow">正在认真做出来</span>
          <h2>下一集，继续。</h2>
          <p>Kaku 正在 iOS 与 Android 上测试，当前全部功能免费开放。</p>
        </div>
        <a className="button light" href="/pricing">了解免费使用</a>
      </section>
    </>
  );
}
