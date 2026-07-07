import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { createVideoPlayer, VideoThumbnail } from 'expo-video';
import { Project } from '@dubbercut/types';
import { AppSymbol } from '@/components';
import { appTheme } from '@/constants/app-theme';
import { radius } from '@/constants';
import { isCachedCoverUri, projectCoverFile } from '@/features/projects/capture-cover-frame';
import { resolveProjectCoverUri } from '@/features/projects/project-cover';
import { loadPlayerSource } from '@/features/editor/services/video-playback';

interface Props {
  project: Project;
  size?: number;
}

type CoverSource = { uri: string } | VideoThumbnail;

async function loadLiveVideoThumbnail(project: Project): Promise<CoverSource | null> {
  if (!project.videoUrl && !project.coverAssetId) return null;
  const player = createVideoPlayer(null);
  try {
    await loadPlayerSource(player, project.videoUrl ?? '', 0.15, project.coverAssetId);
    const thumbs = await player.generateThumbnailsAsync([0.15], {
      maxWidth: 512,
      maxHeight: 512,
    });
    return thumbs[0] ?? null;
  } catch {
    return null;
  } finally {
    player.release();
  }
}

export function ProjectCoverThumb({ project, size = 56 }: Props) {
  const [source, setSource] = useState<CoverSource | null>(null);
  const isVideo =
    project.coverMediaType === 'video' || (!project.coverMediaType && !!project.coverAssetId);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = projectCoverFile(project.id);
      if (cached.exists) {
        if (!cancelled) setSource({ uri: cached.uri });
        return;
      }

      if (project.videoUrl && isCachedCoverUri(project.videoUrl)) {
        if (!cancelled) setSource({ uri: project.videoUrl });
        return;
      }

      const resolved = await resolveProjectCoverUri(project);
      if (cancelled) return;

      if (resolved && isCachedCoverUri(resolved)) {
        setSource({ uri: resolved });
        return;
      }

      if (isVideo) {
        const thumb = await loadLiveVideoThumbnail(project);
        if (!cancelled) setSource(thumb ?? (resolved ? { uri: resolved } : null));
        return;
      }

      setSource(resolved ? { uri: resolved } : null);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [project.id, project.videoUrl, project.coverAssetId, project.coverMediaType, isVideo]);

  if (!source) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <AppSymbol name="folder" size={22} tintColor={appTheme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Image source={source} style={styles.image} contentFit="cover" recyclingKey={project.id} />
      {isVideo ? (
        <View style={styles.playBadge}>
          <AppSymbol name="play" size={14} tintColor="#fff" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: appTheme.dark,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    borderRadius: radius.lg,
    backgroundColor: appTheme.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
