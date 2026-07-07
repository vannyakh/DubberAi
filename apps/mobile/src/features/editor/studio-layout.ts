/** Fixed layout sizes for the studio screen (no vertical scroll). */
export const STUDIO_HEADER_BAR_HEIGHT = 44;
export const STUDIO_PLAYBACK_HEIGHT = 44;
export const STUDIO_TOOLBAR_HEIGHT = 64;
/** Min touch target width; fits longest labels (e.g. Background). */
export const STUDIO_TOOLBAR_ITEM_MIN_WIDTH = 64;
/** Layout reservation for the background tools dock (toolbar overlays above this). */
export const BACKGROUND_DOCK_HEIGHT = 16;
export const STUDIO_FILTER_PILL_HEIGHT = 40;
export const STUDIO_SIDEBAR_WIDTH = 48;
export const STUDIO_RULER_HEIGHT = 20;
export const STUDIO_VIDEO_LANE_HEIGHT = 44;
export const STUDIO_AUDIO_LANE_HEIGHT = 32;
export const STUDIO_TEXT_LANE_HEIGHT = 32;
export const STUDIO_LANE_GAP = 2;
/** Visible track area — scroll when content is taller. */
export const STUDIO_TRACKS_VIEWPORT_HEIGHT =
  STUDIO_VIDEO_LANE_HEIGHT + STUDIO_LANE_GAP + STUDIO_AUDIO_LANE_HEIGHT;
/** @deprecated Use computeTimelineTracks + timelineTracksContentHeight. */
export const STUDIO_TRACKS_HEIGHT =
  STUDIO_VIDEO_LANE_HEIGHT +
  STUDIO_AUDIO_LANE_HEIGHT +
  STUDIO_TEXT_LANE_HEIGHT +
  STUDIO_LANE_GAP * 2;
export const STUDIO_TIMELINE_HEIGHT = STUDIO_RULER_HEIGHT + STUDIO_TRACKS_VIEWPORT_HEIGHT;

/** @deprecated Use lane-specific heights. */
export const STUDIO_TRACK_HEIGHT = STUDIO_VIDEO_LANE_HEIGHT;
/** @deprecated Waveform lives in the audio lane. */
export const STUDIO_WAVE_HEIGHT = STUDIO_AUDIO_LANE_HEIGHT;

/** Preview + header vs editor dock — 60% / 40% split. */
export const STUDIO_PREVIEW_FLEX = 6;
export const STUDIO_EDITOR_FLEX = 4;

export function getStudioHeaderHeight(topInset: number) {
  return topInset + STUDIO_HEADER_BAR_HEIGHT;
}
