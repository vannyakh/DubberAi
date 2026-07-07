import React, { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { AppSymbol } from '@/components';
import { fontSizes, spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';

export const TOOLS_SHEET_ACTION_HEIGHT = 44;
export const TOOLS_SHEET_CONTENT_HEIGHT = 96;
export const TOOLS_SHEET_BOTTOM_PAD = 8;

export function toolsSheetBottomPad(bottomInset: number): number {
  return bottomInset + TOOLS_SHEET_BOTTOM_PAD;
}

export function toolsSheetHeight(bottomInset: number): number {
  return (
    TOOLS_SHEET_CONTENT_HEIGHT +
    TOOLS_SHEET_ACTION_HEIGHT +
    toolsSheetBottomPad(bottomInset)
  );
}

interface ToolsBottomSheetProps {
  progress: SharedValue<number>;
  sheetHeight: number;
  bottomInset: number;
  title: string;
  onApplyAll: () => void;
  onDone: () => void;
  showApplyAll?: boolean;
}

/** Pinned to bottom: 0; content + action bar sit above bottomInset + 8px padding. */
export function ToolsBottomSheet({
  progress,
  sheetHeight,
  bottomInset,
  title,
  onApplyAll,
  onDone,
  showApplyAll = true,
  children,
}: PropsWithChildren<ToolsBottomSheetProps>) {
  const bottomPad = toolsSheetBottomPad(bottomInset);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [sheetHeight, 0], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  const hostStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP),
    pointerEvents: progress.value > 0.01 ? 'box-none' : 'none',
  }));

  return (
    <Animated.View
      style={[styles.host, { height: sheetHeight }, hostStyle]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[styles.sheet, { height: sheetHeight, paddingBottom: bottomPad }, sheetStyle]}
      >
        <View style={styles.content}>{children}</View>
        <View style={styles.actionBar}>
          {showApplyAll ? (
            <Pressable style={styles.applyAll} onPress={onApplyAll} hitSlop={8}>
              <AppSymbol name="layers" size={18} tintColor={editorTheme.text} />
              <Text style={styles.applyAllText}>Apply to all</Text>
            </Pressable>
          ) : (
            <View style={styles.actionSideSpacer} />
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Pressable style={styles.doneBtn} onPress={onDone} accessibilityLabel="Done" hitSlop={8}>
            <AppSymbol name="checkmark" size={22} tintColor={editorTheme.text} />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },
  sheet: {
    backgroundColor: editorTheme.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: editorTheme.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  content: {
    height: TOOLS_SHEET_CONTENT_HEIGHT,
    justifyContent: 'center',
  },
  actionBar: {
    height: TOOLS_SHEET_ACTION_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: editorTheme.border,
    backgroundColor: editorTheme.background,
  },
  applyAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 96,
  },
  actionSideSpacer: {
    minWidth: 96,
  },
  applyAllText: {
    color: editorTheme.text,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: editorTheme.text,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  doneBtn: {
    minWidth: 96,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: TOOLS_SHEET_ACTION_HEIGHT,
  },
});
