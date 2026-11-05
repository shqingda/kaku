import { useState, type CSSProperties } from 'react';

import { Poster } from './product-preview';
import { useI18n } from '../i18n';

const TOTAL_EPISODES = 28;
// Watched episodes shown for each collection status, in the order of `statuses`.
const WATCHED_BY_STATUS = [0, 17, 28, 9, 3];
const ICON_VARIANTS = ['ink', 'color', 'lower'] as const;

export function CollectionDemo() {
  const { t } = useI18n();
  const copy = t.home.features.collection;
  const [status, setStatus] = useState(1);
  const watched = WATCHED_BY_STATUS[status];

  return (
    <div className="demo">
      <div
        aria-label={copy.groupLabel}
        className="segmented"
        role="group"
        style={{ '--index': status, '--count': copy.statuses.length } as CSSProperties}
      >
        <span aria-hidden="true" className="segmented-thumb" />
        {copy.statuses.map((label, index) => (
          <button aria-pressed={index === status} key={label} onClick={() => setStatus(index)} type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="demo-show">
        <Poster tone="rose" />
        <div className="demo-show-copy">
          <strong>{copy.showTitle}</strong>
          <span>{copy.statuses[status]} · {watched} / {TOTAL_EPISODES} {copy.unit}</span>
          <div className="meter"><i style={{ transform: `scaleX(${watched / TOTAL_EPISODES})` }} /></div>
        </div>
      </div>
    </div>
  );
}

export function EpisodesDemo() {
  const { t } = useI18n();
  const copy = t.home.features.episodes;
  const [watched, setWatched] = useState(17);

  return (
    <div className="demo">
      <div className="episode-progress">
        <span>{copy.progressLabel}</span>
        <strong>{watched} / {TOTAL_EPISODES}</strong>
      </div>
      <div className="episode-grid">
        {Array.from({ length: TOTAL_EPISODES }, (_, index) => {
          const episode = index + 1;
          return (
            <button
              aria-label={copy.episodeLabel(episode)}
              aria-pressed={episode <= watched}
              className="episode"
              key={episode}
              onClick={() => setWatched(episode)}
              // Colour spreads outward from the tapped episode.
              style={{ '--distance': Math.abs(episode - watched) } as CSSProperties}
              type="button"
            >
              {episode}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IconsDemo() {
  const { t } = useI18n();
  const copy = t.home.features.icons;
  const [selected, setSelected] = useState<(typeof ICON_VARIANTS)[number]>('ink');

  return (
    <div aria-label={copy.groupLabel} className="icon-picker" role="group">
      {ICON_VARIANTS.map((variant) => (
        <button aria-pressed={variant === selected} key={variant} onClick={() => setSelected(variant)} type="button">
          <img alt="" className="only-light" height="72" loading="lazy" src={`/app-icons/${variant}-light.png`} width="72" />
          <img alt="" className="only-dark" height="72" loading="lazy" src={`/app-icons/${variant}-dark.png`} width="72" />
          <span>{copy.names[variant]}</span>
        </button>
      ))}
    </div>
  );
}
