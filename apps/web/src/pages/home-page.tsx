import { ProductPreview } from '../components/product-preview';
import { useI18n } from '../i18n';

export function HomePage() {
  const { t } = useI18n();

  return (
    <>
      <section className="hero section-pad">
        <div className="hero-copy">
          <div className="pill"><span aria-hidden="true" />{t.home.pill}</div>
          <h1>{t.home.heroTitle1}<br /><em>{t.home.heroTitle2}</em></h1>
          <p>{t.home.heroSub}</p>
          <div className="hero-actions">
            <a className="button primary" href="#features">{t.home.heroPrimary}</a>
            <a className="button secondary" href="https://github.com/shqingda/kaku" rel="noreferrer" target="_blank">{t.home.heroSecondary}</a>
          </div>
          <div className="platform-note"><span aria-hidden="true">●</span>{t.home.platformNote}</div>
        </div>
        <ProductPreview />
      </section>

      <section className="trust-strip" aria-label={t.home.features.title1}>
        {t.home.trust.map((item, index) => (
          <span key={item}>
            {item}
            {index < t.home.trust.length - 1 && <i aria-hidden="true" />}
          </span>
        ))}
      </section>

      <section className="feature-section section-pad" id="features">
        <div className="section-heading">
          <span className="eyebrow">{t.home.features.eyebrow}</span>
          <h2>{t.home.features.title1}<br />{t.home.features.title2}</h2>
          <p>{t.home.features.sub}</p>
        </div>
        <div className="feature-grid">
          {t.home.features.items.map((feature, index) => (
            <article className="feature-card" key={feature.title}>
              <span aria-hidden="true" className="feature-icon">{String(index + 1).padStart(2, '0')}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sync-section section-pad">
        <div className="sync-card">
          <div className="sync-copy">
            <span className="eyebrow">{t.home.sync.eyebrow}</span>
            <h2>{t.home.sync.title1}<br />{t.home.sync.title2}</h2>
            <p>{t.home.sync.copy}</p>
            <a className="text-link" href="/privacy">{t.home.sync.privacyLink} <span aria-hidden="true">→</span></a>
          </div>
          <div className="sync-visual" aria-hidden="true">
            <div className="device-card device-ios"><b>iPhone</b><span>Synced</span><i>17 / 28</i></div>
            <div className="sync-orbit"><span>↻</span></div>
            <div className="device-card device-android"><b>Android</b><span>Online</span><i>17 / 28</i></div>
          </div>
        </div>
      </section>

      <section className="faq-section section-pad" id="faq">
        <div className="section-heading">
          <span className="eyebrow">{t.home.faq.eyebrow}</span>
          <h2>{t.home.faq.title}</h2>
        </div>
        <div className="faq-list">
          {t.home.faq.items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="closing-section section-pad">
        <div>
          <span className="eyebrow">{t.home.closing.eyebrow}</span>
          <h2>{t.home.closing.title}</h2>
          <p>{t.home.closing.copy}</p>
        </div>
        <a className="button light" href="#faq">{t.home.closing.cta}</a>
      </section>
    </>
  );
}
