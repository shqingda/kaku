import { HeaderIconButton } from '@/features/shared/header-icon-button';
import { shareBangumiEntity } from '@/lib/share';

// 导航栏右侧的分享按钮；path 是 bgm.tv 主站路径（以 / 开头）。
export function HeaderShareButton({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  return (
    <HeaderIconButton
      accessibilityHint="通过系统分享面板分享这个链接"
      accessibilityLabel="分享"
      icon={{ android: 'share', ios: 'square.and.arrow.up', web: 'share' }}
      onPress={() => void shareBangumiEntity({ path, title })}
    />
  );
}
