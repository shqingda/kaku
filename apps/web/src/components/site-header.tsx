import { useEffect, useRef, useState } from 'react';

import { GitHubIcon, MonitorIcon, MoonIcon, SunIcon } from './icons';
import { KakuMark } from './kaku-mark';
import { useI18n, useThemeMode } from '../i18n';
import { GITHUB_URL, RELEASES_URL } from '../site-links';

export function SiteHeader() {
  const { lang, setLang, t } = useI18n();
  const { mode, cycleMode } = useThemeMode();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isIsland, setIsIsland] = useState(false);

  // The observer fires only when the page leaves or reaches the top, not on every scroll frame.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setIsIsland(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const themeIcon =
    mode === 'light' ? <SunIcon /> : mode === 'dark' ? <MoonIcon /> : <MonitorIcon />;
  const themeLabel = `${t.header.switchTheme}（${t.header.themeNames[mode]}）`;

  return (
    <>
      <div aria-hidden="true" className="header-sentinel" ref={sentinelRef} />
      <header className={isIsland ? 'site-header is-island' : 'site-header'}>
        <a aria-label="Kaku" className="brand" href="/">
          <KakuMark className="brand-mark" />
          <span>Kaku</span>
        </a>
        <nav aria-label={t.header.navLabel} className="site-nav">
          <a href="/#features">{t.header.nav.features}</a>
          <a href="/#privacy">{t.header.nav.privacy}</a>
          <a href="/#free">{t.header.nav.free}</a>
          <a href="/#faq">{t.header.nav.faq}</a>
        </nav>
        <div className="header-tools">
          <a
            aria-label={t.header.github}
            className="tool-button tool-github"
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
            title={t.header.github}
          >
            <GitHubIcon />
          </a>
          <button
            aria-label={t.header.switchLanguage}
            className="tool-button tool-button-text"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            title={t.header.switchLanguage}
            type="button"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button
            aria-label={themeLabel}
            className="tool-button"
            onClick={cycleMode}
            title={themeLabel}
            type="button"
          >
            {themeIcon}
          </button>
          <a className="button primary compact" href={RELEASES_URL} rel="noreferrer" target="_blank">
            {t.header.download}
          </a>
        </div>
      </header>
    </>
  );
}
