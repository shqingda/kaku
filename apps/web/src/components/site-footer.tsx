import { useI18n } from '../i18n';

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img alt="" aria-hidden="true" className="brand-mark small" height="28" src="/kaku-icon.png" width="28" />
        <div>
          <strong>Kaku</strong>
          <p>{t.footer.tagline}</p>
        </div>
      </div>
      <div className="footer-links">
        <a href="/privacy">{t.footer.privacy}</a>
        <a href="/terms">{t.footer.terms}</a>
        <a href="https://github.com/shqingda/kaku/issues/new" rel="noreferrer" target="_blank">
          {t.footer.feedback}
          <span className="visually-hidden">（{t.footer.feedback}）</span>
        </a>
        <a href="https://github.com/shqingda/kaku" rel="noreferrer" target="_blank">
          {t.footer.github}
          <span className="visually-hidden">（{t.footer.github}）</span>
        </a>
      </div>
      <p className="footer-note">{t.footer.note}</p>
    </footer>
  );
}
