import React from 'react';
import { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

/** Cross-platform symbol names used across the mobile app. */
export type SymbolName =
  | 'add'
  | 'menu'
  | 'grid'
  | 'draft'
  | 'translate'
  | 'scissors'
  | 'import'
  | 'play'
  | 'pause'
  | 'folder'
  | 'more'
  | 'email'
  | 'cloud'
  | 'storage'
  | 'editor'
  | 'logout'
  | 'back'
  | 'help'
  | 'film'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'text'
  | 'delete'
  | 'close'
  | 'effects'
  | 'overlay'
  | 'captions'
  | 'filters'
  | 'adjust'
  | 'volume'
  | 'volumeMuted'
  | 'person'
  | 'notification'
  | 'google'
  | 'apple'
  | 'music'
  | 'checkmark'
  | 'aspectRatio'
  | 'aspectOriginal'
  | 'expand'
  | 'layers'
  | 'undo'
  | 'redo'
  | 'backgroundBlur';

type SymbolSpec = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};

export const SYMBOLS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  grid: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  draft: { ios: 'clock', android: 'schedule', web: 'schedule' },
  translate: { ios: 'globe', android: 'language', web: 'language' },
  scissors: { ios: 'scissors', android: 'content_cut', web: 'content_cut' },
  import: { ios: 'square.and.arrow.down', android: 'download', web: 'download' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  folder: { ios: 'folder', android: 'folder', web: 'folder' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  email: { ios: 'envelope', android: 'mail', web: 'mail' },
  cloud: { ios: 'cloud', android: 'cloud', web: 'cloud' },
  storage: { ios: 'internaldrive', android: 'storage', web: 'storage' },
  editor: { ios: 'film', android: 'movie', web: 'movie' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  film: { ios: 'film.stack', android: 'movie', web: 'movie' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  text: { ios: 'textformat', android: 'title', web: 'title' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  effects: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  overlay: { ios: 'square.on.square', android: 'layers', web: 'layers' },
  captions: { ios: 'captions.bubble', android: 'subtitles', web: 'subtitles' },
  filters: { ios: 'camera.filters', android: 'filter_vintage', web: 'filter_vintage' },
  adjust: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  volume: { ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' },
  volumeMuted: { ios: 'speaker.slash.fill', android: 'volume_off', web: 'volume_off' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  notification: { ios: 'bell', android: 'notifications', web: 'notifications' },
  google: { ios: 'g.circle.fill', android: 'account_circle', web: 'account_circle' },
  apple: { ios: 'apple.logo', android: 'account_circle', web: 'account_circle' },
  music: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  checkmark: { ios: 'checkmark', android: 'check', web: 'check' },
  aspectRatio: { ios: 'aspectratio', android: 'aspect_ratio', web: 'aspect_ratio' },
  aspectOriginal: { ios: 'crop', android: 'crop', web: 'crop' },
  expand: { ios: 'arrow.up.left.and.arrow.down.right', android: 'open_in_full', web: 'open_in_full' },
  layers: { ios: 'square.stack.3d.up', android: 'layers', web: 'layers' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  redo: { ios: 'arrow.uturn.forward', android: 'redo', web: 'redo' },
  backgroundBlur: { ios: 'drop.fill', android: 'blur_on', web: 'blur_on' },
} as const satisfies Record<SymbolName, SymbolSpec>;

interface Props {
  name: SymbolName;
  size?: number;
  tintColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

/** Renders SF Symbols (iOS) / Material Symbols (Android, web). */
export function AppSymbol({ name, size = 22, tintColor, style }: Props) {
  const spec = SYMBOLS[name];
  return (
    <SymbolView
      name={{ ios: spec.ios, android: spec.android, web: spec.web }}
      size={size}
      tintColor={tintColor}
      style={style}
    />
  );
}
