import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { useEditorStore } from '../editor-store';
import { loadPlayerSource } from '../services/video-playback';
import { clipAtTime, clipDuration } from '../types';

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

  const loadedKey = useRef<string | null>(null);
  const loadingKey = useRef<string | null>(null);
  const clipOffset = useRef(0);
  const activeClipId = useRef<string | null>(null);
  const imageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.05;
    p.audioMixingMode = 'mixWithOthers';
  });

  const segment = useMemo(() => clipAtTime(clips, playhead), [clips, playhead]);
  const segmentKey = segment
    ? `${segment.index}:${segment.clip.id}:${segment.clip.mediaType}`
    : 'none';

  const clearImageTimer = () => {
    if (imageTimer.current) {
      clearInterval(imageTimer.current);
      imageTimer.current = null;
    }
  };

  useEffect(() => {
    if (!segment) {
      activeClipId.current = null;
      clipOffset.current = 0;
      clearImageTimer();
      loadedKey.current = null;
      loadingKey.current = null;
      player.pause();
      return;
    }

    let offset = 0;
    for (let i = 0; i < segment.index; i++) offset += clipDuration(clips[i]);
    clipOffset.current = offset;
    activeClipId.current = segment.clip.id;

    if ('muted' in segment.clip) {
      player.muted = segment.clip.muted;
    }
  }, [segment, clips, player]);

  const loadActiveVideo = useCallback(async () => {
    const state = useEditorStore.getState();
    const current = clipAtTime(state.clips, state.playhead);
    if (!current || current.clip.mediaType === 'image') return;

    const key = `${current.index}:${current.clip.id}:${current.clip.mediaType}`;
    if (loadedKey.current === key || loadingKey.current === key) return;

    loadingKey.current = key;
    const sourceTime = current.clip.trimStart + current.localTime;

    try {
      await loadPlayerSource(player, current.clip.uri, sourceTime);
      loadedKey.current = key;
      if ('muted' in current.clip) player.muted = current.clip.muted;
      if (isPlayingRef.current) player.play();
    } catch {
      loadedKey.current = null;
      setPlaying(false);
    } finally {
      if (loadingKey.current === key) loadingKey.current = null;
    }
  }, [player, setPlaying]);

  // Load or swap source when the active clip changes.
  useEffect(() => {
    if (!segment) return;

    if (segment.clip.mediaType === 'image') {
      clearImageTimer();
      loadedKey.current = segmentKey;
      player.pause();
      return;
    }

    if (loadedKey.current === segmentKey) return;
    void loadActiveVideo();
  }, [segmentKey, segment, player, loadActiveVideo]);

  // Retry load when the user presses play before the first source is ready.
  useEffect(() => {
    if (!isPlaying || !segment || segment.clip.mediaType === 'image') return;
    if (loadedKey.current === segmentKey) return;
    void loadActiveVideo();
  }, [isPlaying, segment, segmentKey, loadActiveVideo]);

  // Seek while paused (scrubbing) — never fight the decoder during playback.
  useEffect(() => {
    if (isPlaying || !segment || segment.clip.mediaType === 'image') return;
    if (loadedKey.current !== segmentKey) return;
    if (player.status !== 'readyToPlay') return;

    const sourceTime = segment.clip.trimStart + segment.localTime;
    if (Math.abs(player.currentTime - sourceTime) > 0.05) {
      player.currentTime = sourceTime;
    }
  }, [playhead, isPlaying, segment, segmentKey, player]);

  useEffect(() => {
    if (!segment || segment.clip.mediaType === 'image') {
      player.pause();
      return;
    }
    if (loadedKey.current !== segmentKey) return;

    if (isPlaying) player.play();
    else player.pause();
  }, [isPlaying, segment, segmentKey, player]);

  useEffect(() => {
    clearImageTimer();
    if (!isPlaying) return;

    imageTimer.current = setInterval(() => {
      const state = useEditorStore.getState();
      if (!state.isPlaying) return;

      const current = clipAtTime(state.clips, state.playhead);
      if (!current || current.clip.mediaType !== 'image') return;

      const { clip, localTime, index } = current;
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
    const state = useEditorStore.getState();
    if (!state.isPlaying) return;

    const clipId = activeClipId.current;
    if (!clipId) return;

    const clip = state.clips.find((c) => c.id === clipId);
    if (!clip || clip.mediaType === 'image') return;

    const localTime = currentTime - clip.trimStart;
    if (localTime >= clipDuration(clip) - 0.05) {
      const nextStart = clipOffset.current + clipDuration(clip);
      const index = state.clips.findIndex((c) => c.id === clip.id);
      if (index >= 0 && index < state.clips.length - 1) {
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
    const state = useEditorStore.getState();
    const clip = state.clips.find((c) => c.id === activeClipId.current);
    if (!clip || clip.mediaType === 'image') return;

    const index = state.clips.findIndex((c) => c.id === clip.id);
    const nextStart = clipOffset.current + clipDuration(clip);
    if (index >= 0 && index < state.clips.length - 1) {
      setPlayhead(nextStart + 0.001);
    } else {
      setPlaying(false);
    }
  });

  return player;
}
