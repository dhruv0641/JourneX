import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  WorkspaceSoundListener,
  WorkspaceSoundSetting,
} from '@/components/shared/workspace-sounds';
import { useUiStore } from '@/stores/ui-store';

it('only chimes for successful actions after opt-in and stops immediately when muted', async () => {
  const start = vi.fn();
  const close = vi.fn(async () => {});
  class TestAudioContext {
    state = 'running';
    currentTime = 0;
    close = close;
    createOscillator() {
      return {
        frequency: { setValueAtTime: vi.fn() },
        start,
        stop: vi.fn(),
        connect: (target: unknown) => target,
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
  }
  vi.stubGlobal('AudioContext', TestAudioContext);
  const { unmount } = render(
    <>
      <WorkspaceSoundListener />
      <WorkspaceSoundSetting />
    </>,
  );
  try {
    const toggle = screen.getByRole('switch', { name: 'Confirmation sounds' });
    const { pushToast, dismissToast } = useUiStore.getState();
    expect(toggle).not.toBeChecked();
    act(() => pushToast({ title: 'Saved', kind: 'success' }));
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(JSON.parse(localStorage.getItem('nexora-ui-v1')!).state.soundsEnabled).toBe(true);
    act(() => pushToast({ title: 'Saved again', kind: 'success' }));
    act(() => pushToast({ title: 'Connected', kind: 'info' }));
    act(() => dismissToast(useUiStore.getState().toasts.at(-1)!.id));
    expect(start).toHaveBeenCalledTimes(2);
    fireEvent.click(toggle);
    act(() => pushToast({ title: 'Another save', kind: 'success' }));
    expect(start).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
  } finally {
    unmount();
    vi.unstubAllGlobals();
  }
});
