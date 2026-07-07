import { useEffect, useRef } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { clipAtTime, clipDuration } from '../types';
import { useEditorStore } from '../editor-store';

/**
 * Single expo-video player driven by the global timeline. Swaps sources at
 * clip boundaries and mirrors playback time into the store playhead.
 * Image clips use a timer instead of the video decoder.
 */
export function useTimelinePlayer(): VideoPlayer {
  const clips = useEditorStore((s) => s.clips);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  const loadedUri = useRef<string | null>(null);
  const clipOffset = useRef(0);
  const activeClipId = useRef<string | null>(null);
  const imageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.05;
    p.audioMixingMode = 'mixWithOthers';
  });

  const clearImageTimer = () => {
    if (imageTimer.current) {
      clearInterval(imageTimer.current);
      imageTimer.current = null;
    }
  };

  // Keep the loaded source and seek position in sync with the timeline.
  useEffect(() => {
    const segment = clipAtTime(clips, playhead);
    if (!segment) {
      activeClipId.current = null;
      clearImageTimer();
      return;
    }
    const { clip, localTime, index } = segment;
    let offset = 0;
    for (let i = 0; i < index; i++) offset += clipDuration(clips[i]);
    clipOffset.current = offset;

    const sourceTime = clip.trimStart + localTime;
    const clipChanged = activeClipId.current !== clip.id;
    activeClipId.current = clip.id;

    if (clip.mediaType === 'image') {
      clearImageTimer();
      player.pause();
      loadedUri.current = null;
      return;
    }

    (async () => {
      if (loadedUri.current !== clip.uri) {
        loadedUri.current = clip.uri;
        await player.replaceAsync(clip.uri);
        player.currentTime = sourceTime;
        if (isPlaying) player.play();
        return;
      }
      if (!isPlaying || clipChanged) {
        if (Math.abs(player.currentTime - sourceTime) > 0.08) {
          player.currentTime = sourceTime;
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, playhead, player]);

  useEffect(() => {
    if (isPlaying) player.play();
    else player.pause();
  }, [isPlaying, player]);

  // Advance playhead for still-image clips while playing.
  useEffect(() => {
    clearImageTimer();
    if (!isPlaying) return;

    imageTimer.current = setInterval(() => {
      const state = useEditorStore.getState();
      if (!state.isPlaying) return;

      const segment = clipAtTime(state.clips, state.playhead);
      if (!segment || segment.clip.mediaType !== 'image') return;

      const { clip, localTime, index } = segment;
      const duration = clipDuration(clip);
      const nextLocal = localTime + 0.05;

      if (nextLocal >= duration - 0.05) {
        let offset = 0;
        for (let i = 0; i < index; i++) offset += clipDuration(state.clips[i]);
        const nextStart = offset + duration;
        if (index < state.clips.length - 1) {
          setPlayhead(nextStart + 0.001);
        } else {
          setPlaying(false);
          setPlayhead(nextStart);
        }
        return;
      }

      let offset = 0;
      for (let i = 0; i < index; i++) offset += clipDuration(state.clips[i]);
      setPlayhead(offset + nextLocal);
    }, 50);

    return clearImageTimer;
  }, [isPlaying, clips, setPlayhead, setPlaying]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!isPlaying || !activeClipId.current) return;
    const clip = clips.find((c) => c.id === activeClipId.current);
    if (!clip || clip.mediaType === 'image') return;

    const localTime = currentTime - clip.trimStart;
    if (localTime >= clipDuration(clip) - 0.05) {
      const nextStart = clipOffset.current + clipDuration(clip);
      const index = clips.findIndex((c) => c.id === clip.id);
      if (index >= 0 && index < clips.length - 1) {
        setPlayhead(nextStart + 0.001);
      } else {
        setPlaying(false);
        setPlayhead(nextStart);
      }
      return;
    }
    setPlayhead(clipOffset.current + Math.max(0, localTime));
  });

  useEventListener(player, 'playToEnd', () => {
    const clip = clips.find((c) => c.id === activeClipId.current);
    if (!clip || clip.mediaType === 'image') return;
    const index = clips.findIndex((c) => c.id === clip.id);
    const nextStart = clipOffset.current + clipDuration(clip);
    if (index >= 0 && index < clips.length - 1) {
      setPlayhead(nextStart + 0.001);
    } else {
      setPlaying(false);
    }
  });

  return player;
}
