import { CollectionDemo, EpisodesDemo, IconsDemo } from '../components/feature-demos';
import { KakuMark } from '../components/kaku-mark';
import { ProductPreview } from '../components/product-preview';
import { useI18n } from '../i18n';
import { GITHUB_URL, RELEASES_URL } from '../site-links';

export function HomePage() {
  const { t } = useI18n();
  const { closing, faq, features, free, privacy } = t.home;

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="pill"><span aria-hidden="true" />{t.home.pill}</div>
          <h1>{t.home.heroTitle1}<br /><em>{t.home.heroTitle2}</em></h1>
          <p>{t.home.heroSub}</p>
          <div className="hero-actions">
            <a className="button primary" href={RELEASES_URL} rel="noreferrer" target="_blank">
              {t.home.heroPrimary}<small>{t.home.heroFreeTag}</small>
            </a>
            <a className="button secondary" href={GITHUB_URL} rel="noreferrer" target="_blank">{t.home.heroSecondary}</a>
          </div>
          <span className="platform-note">{t.home.platformNote}</span>
        </div>
        <ProductPreview />
      </section>

      <section className="section" id="features">
        <div className="section-heading reveal">
          <span className="eyebrow">{features.eyebrow}</span>
          <h2>{features.title1}<br />{features.title2}</h2>
          <p>{features.sub}</p>
        </div>
        <div className="bento">
          <article className="card card-half reveal">
            <h3>{features.collection.title}</h3>
            <p>{features.collection.copy}</p>
            <CollectionDemo />
          </article>
          <article className="card card-half reveal">
            <h3>{features.episodes.title}</h3>
            <p>{features.episodes.copy}</p>
            <EpisodesDemo />
          </article>
          <article className="card reveal">
            <h3>{features.community.title}</h3>
            <p>{features.community.copy}</p>
            <div className="thread">
              {features.community.thread.map((comment) => (
                <div className={comment.reply ? 'comment is-reply' : 'comment'} key={comment.name}>
                  <span aria-hidden="true" className="avatar">{comment.name[0]}</span>
                  <div><strong>{comment.name}</strong><span>{comment.text}</span></div>
                </div>
              ))}
            </div>
          </article>
          <article className="card reveal">
            <h3>{features.timeline.title}</h3>
            <p>{features.timeline.copy}</p>
            <ul className="timeline">
              {features.timeline.items.map((item) => (
                <li key={item.name}>
                  <span aria-hidden="true" className="avatar">{item.name[0]}</span>
                  <span><strong>{item.name}</strong> {item.action}</span>
                  <time>{item.time}</time>
                </li>
              ))}
            </ul>
          </article>
          <article className="card reveal">
            <h3>{features.icons.title}</h3>
            <p>{features.icons.copy}</p>
            <IconsDemo />
          </article>
          <article className="card card-wide reveal">
            <div>
              <h3>{features.states.title}</h3>
              <p>{features.states.copy}</p>
            </div>
            <div className="state-notice">
              <span className="state-chip">{features.states.offline}</span>
              <span className="state-text">{features.states.cached}</span>
              <span className="state-retry">{features.states.retry}</span>
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="privacy">
        <div className="privacy-band reveal">
          <div className="privacy-head">
            <div>
              <span className="eyebrow">{privacy.eyebrow}</span>
              <h2>{privacy.title1}<br />{privacy.title2}</h2>
              <p>{privacy.copy}</p>
              <a className="text-link" href="/privacy">{privacy.link} <span aria-hidden="true">→</span></a>
            </div>
            <div aria-hidden="true" className="sync-visual">
              <div className="sync-device"><b>iPhone</b><span>17 / 28</span></div>
              <div className="sync-line"><i /><span>{privacy.synced}</span></div>
              <div className="sync-device"><b>Android</b><span>17 / 28</span></div>
            </div>
          </div>
          <div className="privacy-points">
            {privacy.points.map((point) => (
              <div key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section free-section reveal" id="free">
        <div>
          <span className="eyebrow">{free.eyebrow}</span>
          <strong className="free-price">{free.price}</strong>
        </div>
        <div>
          <h2>{free.title}</h2>
          <p>{free.copy}</p>
          <ul className="free-points">
            {free.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="faq-heading reveal">
          <span className="eyebrow">{faq.eyebrow}</span>
          <h2>{faq.title}</h2>
        </div>
        <div className="faq-list reveal">
          {faq.items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}<span aria-hidden="true" className="faq-toggle" /></summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section closing-section">
        <KakuMark className="closing-mark" />
        <span className="eyebrow">{closing.eyebrow}</span>
        <h2>{closing.title}</h2>
        <p>{closing.copy}</p>
        <div className="hero-actions">
          <a className="button primary" href={RELEASES_URL} rel="noreferrer" target="_blank">{t.home.heroPrimary}</a>
          <a className="button secondary" href="#faq">{closing.cta}</a>
        </div>
      </section>
    </>
  );
}
