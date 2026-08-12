export function NotFoundPage() {
  return (
    <section className="not-found-page section-pad" aria-labelledby="not-found-title">
      <span className="eyebrow">404</span>
      <h1 id="not-found-title">这里暂时没有内容。</h1>
      <p>这个地址可能已经变化，也可能还没有开放。你可以返回首页，或前往支持页反馈问题。</p>
      <div className="not-found-actions">
        <a className="button primary" href="/">返回首页</a>
        <a className="button secondary" href="/support">获取支持</a>
      </div>
    </section>
  );
}
