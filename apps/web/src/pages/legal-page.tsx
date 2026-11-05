import { useI18n } from '../i18n';

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const { t } = useI18n();
  const doc = t.legal[type];

  return (
    <article className="legal-page">
      <header className="legal-heading">
        <span className="eyebrow">{type === 'privacy' ? 'Privacy' : 'Terms'}</span>
        <h1>{doc.title}</h1>
        <p>{doc.intro}</p>
        <small>{doc.updated}</small>
      </header>
      <div className="legal-layout">
        <nav aria-label={doc.title} className="legal-toc">
          {doc.sections.map((section, index) => (
            <a href={`#section-${index + 1}`} key={section.title}>{section.title}</a>
          ))}
        </nav>
        <div className="legal-content">
          {doc.sections.map((section, index) => (
            <section id={`section-${index + 1}`} key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
