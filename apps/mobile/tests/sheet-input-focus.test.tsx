import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { TextInput } from 'react-native';
import { useSheetInputFocus } from '@/features/shared/use-sheet-input-focus';

beforeEach(() => jest.useFakeTimers());
afterEach(async () => { await cleanup(); jest.useRealTimers(); });

test('waits for presentation and draft readiness, focuses once, cancels on close', async () => {
  const focus = jest.fn();
  const hook = await renderHook<ReturnType<typeof useSheetInputFocus>, { visible: boolean; editable: boolean }>(({ visible, editable }) => useSheetInputFocus(visible, editable), {
    initialProps: { visible: true, editable: false },
  });
  hook.result.current.inputRef.current = { focus } as unknown as TextInput;
  await act(() => hook.result.current.onShow());
  await act(() => jest.runOnlyPendingTimers());
  expect(focus).not.toHaveBeenCalled();
  await hook.rerender({ visible: true, editable: true });
  await act(() => jest.runOnlyPendingTimers());
  expect(focus).toHaveBeenCalledTimes(1);
  await hook.rerender({ visible: true, editable: false });
  await hook.rerender({ visible: true, editable: true });
  await act(() => jest.runOnlyPendingTimers());
  expect(focus).toHaveBeenCalledTimes(1);
  await hook.rerender({ visible: false, editable: true });
  await hook.rerender({ visible: true, editable: true });
  await act(() => hook.result.current.onShow());
  await hook.rerender({ visible: false, editable: true });
  await act(() => jest.runOnlyPendingTimers());
  expect(focus).toHaveBeenCalledTimes(1);
});
