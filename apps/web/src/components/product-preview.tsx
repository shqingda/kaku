import { useI18n } from '../i18n';

const posterTones = ['rose', 'amber', 'violet'] as const;
// Episode cells for the mock screen: 17 of 28 watched, as in the other mocks.
const episodes = Array.from({ length: 28 }, (_, index) => index < 17);

export function Poster({ tone }: { tone: (typeof posterTones)[number] }) {
  return <span aria-hidden="true" className={`poster poster-${tone}`} />;
}

function PhoneBar() {
  return (
    <div className="phone-bar">
      <span>9:41</span>
      <i />
    </div>
  );
}

export function ProductPreview() {
  const { t } = useI18n();
  const copy = t.home.preview;

  return (
    <div aria-label={copy.label} className="product-stage" role="img">
      <div aria-hidden="true" className="phone phone-left">
        <div className="phone-screen">
          <PhoneBar />
          <div className="mock-cover"><Poster tone="rose" /></div>
          <span className="mock-meta">{copy.detailMeta}</span>
          <h3 className="mock-title">{copy.detailTitle}</h3>
          <div className="mock-panel">
            <div className="mock-row">
              <span>{copy.collectionLabel}</span>
              <strong>{copy.collectionStatus}</strong>
            </div>
            <div className="mock-meter"><i style={{ width: '61%' }} /></div>
            <div className="mock-row">
              <span>{copy.progress}</span>
              <span>★★★★★ {copy.rating}</span>
            </div>
          </div>
          <div className="mock-panel mock-score">
            <strong>9.4</strong>
            <span>{copy.ratingCount}</span>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="phone phone-center">
        <div className="phone-screen">
          <PhoneBar />
          <span className="mock-meta">{copy.weekday}</span>
          <h3 className="mock-title mock-title-large">{copy.continueTitle}</h3>
          <div className="mock-search">{copy.search}</div>
          <div className="mock-list">
            {copy.shows.map((show, index) => (
              <div className="mock-show" key={show.title}>
                <Poster tone={posterTones[index]} />
                <div>
                  <strong>{show.title}</strong>
                  <span>{show.meta}</span>
                </div>
              </div>
            ))}
          </div>
          <h4 className="mock-subtitle">{copy.friendsTitle}</h4>
          <div className="mock-panel mock-friend">
            <span className="mock-avatar">M</span>
            <span>{copy.friendLine}</span>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="phone phone-right">
        <div className="phone-screen">
          <PhoneBar />
          <h3 className="mock-title mock-title-large">{copy.episodesTitle}</h3>
          <span className="mock-meta">{copy.episodesMeta}</span>
          <div className="mock-episodes">
            {episodes.map((watched, index) => (
              <span className={watched ? 'is-watched' : undefined} key={index}>{index + 1}</span>
            ))}
          </div>
          <h4 className="mock-subtitle">{copy.discussionTitle}</h4>
          {copy.discussion.map((comment) => (
            <div className="mock-panel mock-comment" key={comment.name}>
              <strong>{comment.name}</strong>
              <span>{comment.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
