// The stacked KAKU wordmark as inline SVG, so it follows the page theme. Its
// geometry comes from apps/mobile/scripts/generate-app-icons.mjs.
export function KakuMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 -12 672 664">
      <path d="M0 0 L85 0 L85 300 L0 300 Z M84 0 L300 0 L84 150 Z M84 150 L300 300 L84 300 Z M0 344 L85 344 L85 644 L0 644 Z M84 344 L300 344 L84 494 Z" />
      <path
        d="M502 -12 L672 300 L576.3 300 L548.1 248.1 L455.9 248.1 L427.7 300 L332 300 Z M502 163.6 L519.7 196 L484.3 196 Z"
        fillRule="evenodd"
      />
      <path d="M352 344 V502 A150 150 0 0 0 652 502 V344 H568 V502 A66 66 0 0 1 436 502 V344 Z" />
      <path className="kaku-mark-rose" d="M84 494 L300 644 L84 644 Z" />
    </svg>
  );
}
