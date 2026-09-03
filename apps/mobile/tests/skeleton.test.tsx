import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SkeletonBox } from '@/features/shared/skeleton';

describe('SkeletonBox', () => {
  it('renders a placeholder with the requested geometry', async () => {
    const screen = await render(
      <SkeletonBox borderRadius={16} height={120} width={200} />,
    );

    const style = StyleSheet.flatten(screen.root?.props.style ?? []);

    expect(style.height).toBe(120);
    expect(style.width).toBe(200);
    expect(style.borderRadius).toBe(16);
  });

  it('accepts percentage widths for layout-stable rows', async () => {
    const screen = await render(<SkeletonBox height={18} width="62%" />);

    const style = StyleSheet.flatten(screen.root?.props.style ?? []);

    expect(style.width).toBe('62%');
  });
});
