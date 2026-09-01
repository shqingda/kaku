export const HOME_SHORTCUTS = [
  {
    href: '/calendar',
    id: 'calendar',
    androidIcon: 'calendar_month',
    iosIcon: 'date',
    subtitle: '本周动画放送安排',
    title: '每日放送',
  },
  {
    href: '/explore',
    id: 'search',
    androidIcon: 'search',
    iosIcon: 'search',
    subtitle: '搜索动画、书籍与游戏',
    title: '搜索',
  },
  {
    href: '/rankings',
    id: 'rankings',
    androidIcon: 'leaderboard',
    iosIcon: 'favorite',
    subtitle: '公开条目排名',
    title: '排行榜',
  },
  {
    href: '/browse',
    id: 'browse',
    androidIcon: 'filter_alt',
    iosIcon: 'bookmark',
    subtitle: '按类型浏览条目',
    title: '分类浏览',
  },
] as const;
