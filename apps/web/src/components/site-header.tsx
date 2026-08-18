import { GitHubIcon, MonitorIcon, MoonIcon, SunIcon } from './icons';
import { useI18n, useThemeMode } from '../i18n';

export function SiteHeader() {
  const { lang, setLang, t } = useI18n();
  const { mode, cycleMode } = useThemeMode();
  const themeIcon =
    mode === 'light' ? <SunIcon /> : mode === 'dark' ? <MoonIcon /> : <MonitorIcon />;

  return (
    <header className="site-header">
      <a aria-label="Kaku" className="brand" href="/">
        <img alt="" aria-hidden="true" className="brand-mark" height="32" src="/kaku-icon.png" width="32" />
        <span>Kaku</span>
      </a>
      <div className="header-tools" role="group" aria-label={t.header.switchTheme}>
        <a
          aria-label={t.header.github}
          className="tool-button"
          href="https://github.com/shqingda/kaku"
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
          aria-label={`${t.header.switchTheme}（${t.header.themeNames[mode]}）`}
          className="tool-button"
          onClick={cycleMode}
          title={`${t.header.switchTheme}（${t.header.themeNames[mode]}）`}
          type="button"
        >
          {themeIcon}
        </button>
      </div>
    </header>
  );
}
