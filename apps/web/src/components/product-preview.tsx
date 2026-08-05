const shows = [
  { progress: '17 / 28', title: '葬送的芙莉莲', tone: 'lilac' },
  { progress: '8 / 12', title: '胆大党', tone: 'coral' },
  { progress: '26 / 26', title: '攻壳机动队', tone: 'ocean' },
];

export function ProductPreview() {
  return (
    <div aria-label="Kaku 应用界面预览" className="product-stage">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="phone phone-main">
        <div className="phone-bar"><span>9:41</span><span>● ●●</span></div>
        <div className="app-heading">
          <div><span className="eyebrow">星期三</span><h3>继续观看</h3></div>
          <div className="avatar-dot">Q</div>
        </div>
        <div className="search-pill">⌕&nbsp;&nbsp;搜索动画、书籍、音乐与游戏</div>
        <div className="show-list">
          {shows.map((show) => (
            <article className="show-row" key={show.title}>
              <div className={`poster ${show.tone}`}><span>K</span></div>
              <div className="show-copy"><strong>{show.title}</strong><span>在看 · {show.progress} 集</span></div>
              <span className="row-chevron">›</span>
            </article>
          ))}
        </div>
        <div className="tab-bar"><span className="active">⌂</span><span>⌕</span><span>◉</span></div>
      </section>
      <section className="phone phone-detail">
        <div className="phone-bar"><span>9:41</span><span>● ●●</span></div>
        <div className="detail-cover"><span>FRIEREN</span></div>
        <span className="detail-year">2023</span>
        <h3>葬送的芙莉莲</h3>
        <div className="collection-card">
          <div><span>收藏盒</span><strong>在看</strong></div>
          <div className="collection-meta"><b>17 / 28 集</b><i /><b>★★★★★ 力荐</b></div>
        </div>
        <div className="score-card"><b>9.4</b><span>#12</span><span>2.1 万人评分</span></div>
      </section>
    </div>
  );
}
