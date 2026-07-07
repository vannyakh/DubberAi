import { useEffect, useRef } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { clipAtTime, clipDuration } from '../types';
import { useEditorStore } from '../editor-store';

/**
 * Single expo-video player driven by the global timeline. Swaps sources at
 * clip boundaries and mirrors playback time into the store playhead.
 */
export function useTimelinePlayer(): VideoPlayer {
  const clips = useEditorStore((s) => s.clips);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setPlaying = useEditorStore((s) => s.setPlaying);

  const loadedUri = useRef<string | null>(null);
  // Timeline seconds elapsed before the currently loaded clip.
  const clipOffset = useRef(0);
  const activeClipId = useRef<string | null>(null);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.05;
    p.audioMixingMode = 'mixWithOthers';
  });

  // Keep the loaded source and seek position in sync with the timeline.
  useEffect(() => {
    const segment = clipAtTime(clips, playhead);
    if (!segment) {
      activeClipId.current = null;
      return;
    }
    const { clip, localTime, index } = segment;
    let offset = 0;
    for (let i = 0; i < index; i++) offset += clipDuration(clips[i]);
    clipOffset.current = offset;

    const sourceTime = clip.trimStart + localTime;
    const clipChanged = activeClipId.current !== clip.id;
    activeClipId.current = clip.id;

    (async () => {
      if (loadedUri.current !== clip.uri) {
        loadedUri.current = clip.uri;
        await player.replaceAsync(clip.uri);
        player.currentTime = sourceTime;
        if (isPlaying) player.play();
        return;
      }
      // Same source: only seek on scrubs or when hopping between split clips,
      // not on every timeUpdate echo while playing.
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

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!isPlaying || !activeClipId.current) return;
    const clip = clips.find((c) => c.id === activeClipId.current);
    if (!clip) return;

    const localTime = currentTime - clip.trimStart;
    if (localTime >= clipDuration(clip) - 0.05) {
      // Reached the trim-out point: advance to the next clip or stop.
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
    if (!clip) return;
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
