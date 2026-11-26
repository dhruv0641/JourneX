'use client';

import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';

let audio: AudioContext | undefined;

async function unlockAudio() {
  if (!window.AudioContext || !useUiStore.getState().soundsEnabled) return;
  try {
    audio ??= new AudioContext();
    if (audio.state !== 'running') await audio.resume();
  } catch {
    // Some browsers or device settings disallow audio.
  }
}

function playConfirmation() {
  if (
    !audio ||
    audio.state !== 'running' ||
    document.hidden ||
    !useUiStore.getState().soundsEnabled
  )
    return;
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  tone.frequency.setValueAtTime(440, now);
  tone.frequency.setValueAtTime(554.37, now + 0.075);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
  tone.connect(gain).connect(audio.destination);
  tone.onended = () => {
    tone.disconnect();
    gain.disconnect();
  };
  tone.start(now);
  tone.stop(now + 0.2);
}

export function WorkspaceSoundListener() {
  const enabled = useUiStore((state) => state.soundsEnabled);
  useEffect(() => {
    if (!enabled) return;
    function handleClick(event: MouseEvent) {
      if (event.isTrusted && audio?.state !== 'running') void unlockAudio();
    }
    document.addEventListener('click', handleClick, true);
    const unsubscribe = useUiStore.subscribe((state, previous) => {
      const notice = state.toasts.at(-1);
      if (notice?.kind === 'success' && !previous.toasts.includes(notice)) playConfirmation();
    });
    return () => {
      unsubscribe();
      document.removeEventListener('click', handleClick, true);
      void audio?.close().catch(() => {});
      audio = undefined;
    };
  }, [enabled]);
  return null;
}

export function WorkspaceSoundSetting() {
  const enabled = useUiStore((state) => state.soundsEnabled);
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span id="sound-label" className="block text-sm font-medium">
          Confirmation sounds
        </span>
        <span id="sound-help" className="block text-xs leading-relaxed text-muted-foreground">
          Play a short chime when an action succeeds. Saved on this device.
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-labelledby="sound-label"
        aria-describedby="sound-help"
        className="h-5 w-5 shrink-0 cursor-pointer accent-primary"
        checked={enabled}
        onChange={(event) => {
          const next = event.currentTarget.checked;
          useUiStore.getState().setSoundsEnabled(next);
          if (next) void unlockAudio().then(playConfirmation);
        }}
      />
    </label>
  );
}
