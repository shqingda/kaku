import { KakuMark } from './kaku-mark';
import { useI18n } from '../i18n';
import { APK_DOWNLOAD_URL, GITHUB_URL, ISSUES_URL } from '../site-links';

export function SiteFooter() {
  const { t } = useI18n();
  const { footer } = t;

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <KakuMark className="footer-mark" />
          <p>{footer.tagline}</p>
        </div>
        <nav aria-label={footer.productTitle}>
          <h2>{footer.productTitle}</h2>
          <a href="/#features">{footer.nav.features}</a>
          <a href="/#privacy">{footer.nav.privacy}</a>
          <a href="/#free">{footer.nav.free}</a>
          <a href="/#faq">{footer.nav.faq}</a>
        </nav>
        <nav aria-label={footer.legalTitle}>
          <h2>{footer.legalTitle}</h2>
          <a href="/privacy">{footer.privacy}</a>
          <a href="/terms">{footer.terms}</a>
        </nav>
        <nav aria-label={footer.communityTitle}>
          <h2>{footer.communityTitle}</h2>
          <a href={APK_DOWNLOAD_URL} rel="noreferrer">{footer.download}</a>
          <a href={ISSUES_URL} rel="noreferrer" target="_blank">{footer.feedback}</a>
          <a href={GITHUB_URL} rel="noreferrer" target="_blank">{footer.github}</a>
        </nav>
      </div>
      <p className="footer-note">{footer.note}</p>
    </footer>
  );
}
