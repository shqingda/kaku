const RATING_LABELS = {
  1: '不忍直视',
  2: '很差',
  3: '差',
  4: '较差',
  5: '不过不失',
  6: '还行',
  7: '推荐',
  8: '力荐',
  9: '神作',
  10: '超神作',
} as const;

export function getRatingLabel(rating: number) {
  return RATING_LABELS[rating as keyof typeof RATING_LABELS] ?? `${rating} 分`;
}
