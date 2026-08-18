import { useI18n } from '../i18n';

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const { t } = useI18n();
  const doc = t.legal[type];

  return (
    <section className="legal-page section-pad">
      <div className="legal-heading">
        <span className="eyebrow">{type === 'privacy' ? 'Privacy' : 'Terms'}</span>
        <h1>{doc.title}</h1>
        <p>{doc.intro}</p>
        <small>{doc.updated}</small>
      </div>
      <div className="legal-content">
        {doc.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
