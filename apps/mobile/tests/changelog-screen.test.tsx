import { fireEvent, render } from '@testing-library/react-native';
import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { CHANGELOG } from '@/features/changelog/changelog-data';
import ChangelogScreen from '@/app/changelog';
import { ThemeProvider } from '@/features/theme/theme-provider';
import { useReduceMotion } from '@/lib/use-reduce-motion';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/lib/open-url', () => ({ openExternalUrl: jest.fn() }));
jest.mock('@/lib/use-reduce-motion', () => ({ useReduceMotion: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SafeAreaView: (props: object) => React.createElement(View, props) };
});

describe('ChangelogScreen', () => {
  beforeEach(() => {
    jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(<T,>(initial: T) =>
      useRef({ value: initial } as Reanimated.SharedValue<T>).current,
    );
    // Read the latest shared values without simulating the native animation clock.
    jest.spyOn(Reanimated, 'useAnimatedStyle').mockImplementation((read) => {
      const style = {};
      for (const key of Object.keys(read())) {
        Object.defineProperty(style, key, { enumerable: true, get: () => (read() as Record<string, unknown>)[key] });
      }
      return style as unknown as ReturnType<typeof Reanimated.useAnimatedStyle>;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([false, true])('measures, collapses, and reopens the current release (reduced motion: %s)', async (reduced) => {
    jest.mocked(useReduceMotion).mockReturnValue(reduced);
    const screen = await render(<ThemeProvider><ChangelogScreen /></ThemeProvider>);
    const note = screen.getByText(CHANGELOG[0]!.notes[0]!);
    const measurement = note.parent!.parent!;
    const clip = measurement.parent!;
    expect(StyleSheet.flatten(clip.props.style).height).toBe(0);
    // The measured content must not share the clipping container's height constraint.
    expect(StyleSheet.flatten(measurement.props.style)).toMatchObject({ position: 'absolute', left: 0, right: 0, top: 0 });
    await fireEvent(measurement, 'layout', { nativeEvent: { layout: { height: 64, width: 320, x: 0, y: 0 } } });
    expect(StyleSheet.flatten(clip.props.style)).toMatchObject({ height: 64, opacity: 1 });
    await fireEvent.press(screen.getByRole('button', { name: `版本 ${CHANGELOG[0]!.version}，收起更新内容` }));
    expect(StyleSheet.flatten(clip.props.style).height).toBe(0);
    await fireEvent.press(screen.getByRole('button', { name: `版本 ${CHANGELOG[0]!.version}，展开更新内容` }));
    expect(StyleSheet.flatten(clip.props.style).height).toBe(64);
    expect(screen.getAllByRole('button', { name: /^版本 / })).toHaveLength(1);
  });
});
