import { act, fireEvent, render } from '@testing-library/react-native';
import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { MIN_TOUCH_SIZE } from '@/constants/design';
import { ExpandableText } from '@/features/shared/expandable-text';
import { SubjectSummaryPanel } from '@/features/subject-detail/subject-summary-panel';
import { playSelectionHaptic } from '@/lib/haptics';

let mockFontScale = 1;
let mockReduceMotion = false;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 400, height: 800, scale: 1, fontScale: mockFontScale }),
}));
jest.mock('@/lib/use-reduce-motion', () => ({ useReduceMotion: () => mockReduceMotion }));

type Screen = Awaited<ReturnType<typeof render>>;
const text = '需要按真实排版高度展开的简介。';

function layout(height: number, width = 320) {
  return { nativeEvent: { layout: { height, width, x: 0, y: 0 } } };
}

function textLayout(heights: number[]) {
  let y = 0;
  return { nativeEvent: { lines: heights.map(height => {
    const line = { ascender: height, capHeight: height, descender: 0, height, width: 300, x: 0, xHeight: height, y, text: '一行文字' };
    y += height;
    return line;
  }) } };
}

function measuredText(screen: Screen) {
  return screen.getByTestId('expandable-text-measurement', { includeHiddenElements: true });
}

function visibleHeight(screen: Screen) {
  return StyleSheet.flatten(screen.getByTestId('expandable-text-body').props.style).height;
}

async function measure(screen: Screen, lineHeights: number[], fullHeight: number) {
  await fireEvent(measuredText(screen), 'textLayout', textLayout(lineHeights));
  await fireEvent(measuredText(screen), 'layout', layout(fullHeight));
}

beforeEach(() => {
  mockFontScale = 1;
  mockReduceMotion = false;
  jest.mocked(playSelectionHaptic).mockClear();
  jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(<T,>(initial: T) =>
    useRef({ value: initial } as Reanimated.SharedValue<T>).current,
  );
  jest.spyOn(Reanimated, 'useAnimatedStyle').mockImplementation(read => {
    const style = {};
    for (const key of Object.keys(read())) {
      Object.defineProperty(style, key, { enumerable: true, get: () => (read() as Record<string, unknown>)[key] });
    }
    return style as unknown as ReturnType<typeof Reanimated.useAnimatedStyle>;
  });
});

afterEach(() => jest.restoreAllMocks());

test('shows a native preview before measuring and omits the toggle when all lines fit', async () => {
  const screen = await render(<ExpandableText noun="简介" text={text} />);
  expect(screen.getByText(text).props.numberOfLines).toBe(3);
  expect(screen.getAllByText(text)).toHaveLength(1);
  expect(screen.queryByRole('button')).toBeNull();

  await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0));
  await measure(screen, [28, 28], 62);

  expect(visibleHeight(screen)).toBe(62);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText(text).props.numberOfLines).toBeUndefined();
});

test('uses measured line heights and responds on pointer-down before expanding the full text', async () => {
  const screen = await render(<ExpandableText noun="简介" text={text} />);
  await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0));
  await measure(screen, [31, 40, 45, 44], 166);
  expect(visibleHeight(screen)).toBe(116);

  const button = screen.getByRole('button', { name: '展开简介' });
  expect(button).toHaveStyle({ minHeight: MIN_TOUCH_SIZE, minWidth: MIN_TOUCH_SIZE });
  await fireEvent(button, 'pressIn');
  expect(playSelectionHaptic).toHaveBeenCalledTimes(1);
  expect(visibleHeight(screen)).toBe(116);
  await fireEvent.press(button);
  expect(screen.getByRole('button', { name: '收起简介' })).toBeTruthy();
  expect(visibleHeight(screen)).toBe(166);
  expect(playSelectionHaptic).toHaveBeenCalledTimes(1);
});

test('measures short summaries with multiple line breaks at the detail-panel call site', async () => {
  const screen = await render(<SubjectSummaryPanel summary={'一\n二\n三\n四'} />);
  await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0));
  await measure(screen, [24, 24, 24, 24], 96);

  expect(visibleHeight(screen)).toBe(72);
  await fireEvent.press(screen.getByRole('button', { name: '展开简介' }));
  expect(visibleHeight(screen)).toBe(96);
  expect(screen.getByRole('button', { name: '收起简介' })).toBeTruthy();
});

test.each(['text', 'width', 'fontScale'] as const)('ignores measurements from before a %s change', async change => {
  const screen = await render(<ExpandableText noun="简介" text={text} />);
  await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0));
  await measure(screen, [24, 24, 24, 24], 100);
  await fireEvent.press(screen.getByRole('button', { name: '展开简介' }));
  const oldTextLayout = measuredText(screen).props.onTextLayout;
  const oldLayout = measuredText(screen).props.onLayout;

  if (change === 'width') {
    await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0, 180));
  } else {
    if (change === 'fontScale') mockFontScale = 2;
    await screen.rerender(<ExpandableText noun="简介" text={change === 'text' ? '另一条需要重新测量的简介。' : text} />);
  }
  await act(async () => {
    oldTextLayout(textLayout([300, 300, 300, 300]));
    oldLayout(layout(1200));
  });
  expect(visibleHeight(screen)).toBe(100);
  expect(screen.queryByRole('button')).toBeNull();

  await measure(screen, [35, 35, 35, 35, 35], 180);
  const expectedHeight = change === 'text' ? 105 : 180;
  expect(visibleHeight(screen)).toBe(expectedHeight);
  expect(screen.getByRole('button', { name: change === 'text' ? '展开简介' : '收起简介' })).toBeTruthy();
  await act(async () => {
    oldLayout(layout(1400));
    oldTextLayout(textLayout([350, 350, 350, 350]));
  });
  expect(visibleHeight(screen)).toBe(expectedHeight);

  // 切回原来的条件也属于新一轮测量，不能接受第一轮仍在队列里的事件。
  if (change === 'width') {
    await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0, 320));
  } else {
    mockFontScale = 1;
    await screen.rerender(<ExpandableText noun="简介" text={text} />);
  }
  await act(async () => {
    oldTextLayout(textLayout([300, 300, 300, 300]));
    oldLayout(layout(1200));
  });
  expect(visibleHeight(screen)).toBe(expectedHeight);
  expect(screen.queryByRole('button')).toBeNull();

  await measure(screen, [24, 24, 24, 24], 100);
  expect(visibleHeight(screen)).toBe(change === 'text' ? 72 : 100);
  expect(screen.getByRole('button', { name: change === 'text' ? '展开简介' : '收起简介' })).toBeTruthy();
});

test('reverses an unfinished spring from the current visible height', async () => {
  const spring = jest.spyOn(Reanimated, 'withSpring');
  const screen = await render(<ExpandableText noun="简介" text={text} />);
  await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0));
  await measure(screen, [24, 24, 24, 24, 24, 24], 144);
  spring.mockImplementationOnce(() => 100);
  await fireEvent.press(screen.getByRole('button', { name: '展开简介' }));
  expect(visibleHeight(screen)).toBe(100);

  let resumedHeight: unknown;
  spring.mockImplementationOnce(target => {
    resumedHeight = visibleHeight(screen);
    return target;
  });
  await fireEvent.press(screen.getByRole('button', { name: '收起简介' }));
  expect(resumedHeight).toBe(100);
  expect(visibleHeight(screen)).toBe(72);
});

test('settles an active animation immediately when reduced motion becomes enabled', async () => {
  const spring = jest.spyOn(Reanimated, 'withSpring');
  const screen = await render(<ExpandableText noun="简介" text={text} />);
  await fireEvent(screen.getByTestId('expandable-text-layout'), 'layout', layout(0));
  await measure(screen, [24, 24, 24, 24, 24, 24], 144);
  spring.mockImplementationOnce(() => 100);
  await fireEvent.press(screen.getByRole('button', { name: '展开简介' }));
  expect(visibleHeight(screen)).toBe(100);

  spring.mockClear();
  mockReduceMotion = true;
  await screen.rerender(<ExpandableText noun="简介" text={text} />);
  expect(visibleHeight(screen)).toBe(144);
  await fireEvent.press(screen.getByRole('button', { name: '收起简介' }));
  expect(visibleHeight(screen)).toBe(72);
  expect(spring).not.toHaveBeenCalled();
});
