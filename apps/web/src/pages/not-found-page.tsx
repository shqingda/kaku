import { useI18n } from '../i18n';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <section className="not-found-page section-pad" aria-labelledby="not-found-title">
      <span className="eyebrow">404</span>
      <h1 id="not-found-title">{t.notFound.title}</h1>
      <p>{t.notFound.copy}</p>
      <div className="not-found-actions">
        <a className="button primary" href="/">{t.notFound.back}</a>
        <a className="button secondary" href="https://github.com/shqingda/kaku/issues/new" rel="noreferrer" target="_blank">{t.notFound.feedback}</a>
      </div>
    </section>
  );
}
