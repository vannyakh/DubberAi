import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoThumbnail } from 'expo-video';
import { editorTheme } from '@/constants/editor-theme';
import { buildFilmstripLayout } from '../timeline-utils';

export interface TimelineFilmstripSource {
  id: string;
  uri: string;
  mediaType: 'video' | 'image';
  trimStart: number;
  trimEnd: number;
  sourceDuration: number;
}

interface TimelineFilmstripProps {
  source: TimelineFilmstripSource;
  segmentWidth: number;
  pxPerSecond: number;
  thumbnails?: VideoThumbnail[];
  displayUri?: string;
}

export function previewSourceForTimelineMedia(
  source: TimelineFilmstripSource,
  thumbnails: VideoThumbnail[] | undefined,
  displayUri: string | undefined,
  normalizedTime: number,
): { uri: string } | VideoThumbnail | null {
  const uri = displayUri ?? source.uri;

  if (source.mediaType === 'image') {
    return { uri };
  }

  const clipLen = Math.max(0.001, source.trimEnd - source.trimStart);
  const sourceTime = source.trimStart + normalizedTime * clipLen;

  if (thumbnails && thumbnails.length > 0) {
    const idx = Math.min(
      thumbnails.length - 1,
      Math.round(
        (sourceTime / Math.max(0.001, source.sourceDuration)) * (thumbnails.length - 1),
      ),
    );
    return thumbnails[idx];
  }

  return { uri };
}

export function TimelineFilmstrip({
  source,
  segmentWidth,
  pxPerSecond,
  thumbnails,
  displayUri,
}: TimelineFilmstripProps) {
  const layoutEnd =
    source.mediaType === 'image'
      ? source.trimEnd
      : source.sourceDuration;
  const { tileCount, tiles } = useMemo(
    () => buildFilmstripLayout(segmentWidth, pxPerSecond, source.trimStart, layoutEnd),
    [layoutEnd, pxPerSecond, segmentWidth, source.trimStart],
  );

  return (
    <View style={styles.filmstrip}>
      {tiles.map(({ index, width }) => (
        <FilmstripTile
          key={`${source.id}:${index}`}
          source={source}
          thumbnails={thumbnails}
          displayUri={displayUri}
          tileIndex={index}
          tileCount={tileCount}
          width={width}
        />
      ))}
    </View>
  );
}

function FilmstripTile({
  source,
  thumbnails,
  displayUri,
  tileIndex,
  tileCount,
  width,
}: {
  source: TimelineFilmstripSource;
  thumbnails: VideoThumbnail[] | undefined;
  displayUri: string | undefined;
  tileIndex: number;
  tileCount: number;
  width: number;
}) {
  const frameSource = previewSourceForTimelineMedia(
    source,
    thumbnails,
    displayUri,
    (tileIndex + 0.5) / tileCount,
  );

  return (
    <View style={[styles.filmstripTile, { width }]}>
      {frameSource ? (
        <Image
          source={frameSource}
          style={styles.thumb}
          contentFit="cover"
          recyclingKey={`${source.id}:${tileIndex}`}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filmstrip: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  filmstripTile: {
    height: '100%',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: editorTheme.surfaceRaised,
  },
});
