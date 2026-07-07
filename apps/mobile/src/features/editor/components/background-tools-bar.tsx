import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSymbol, SymbolName } from '@/components';
import { spacing } from '@/constants';
import { editorTheme } from '@/constants/editor-theme';
import { BACKGROUND_TOOLS, BackgroundToolId } from '../background-tool';
import { STUDIO_TOOLBAR_HEIGHT, STUDIO_TOOLBAR_ITEM_MIN_WIDTH } from '../studio-layout';

interface BackgroundToolsBarProps {
  activeTool: BackgroundToolId | null;
  onSelectTool: (tool: BackgroundToolId) => void;
  onBack: () => void;
  bottomInset?: number;
}

const TOOL_SYMBOLS: Record<BackgroundToolId, SymbolName> = {
  color: 'backgroundColor',
  image: 'backgroundImage',
  blur: 'backgroundBlur',
  brand: 'brandBackground',
};

/** CapCut-style sub-toolbar shown while the background panel is open. */
export function BackgroundToolsBar({
  activeTool,
  onSelectTool,
  onBack,
  bottomInset = 0,
}: BackgroundToolsBarProps) {
  return (
    <View style={{ paddingBottom: bottomInset }}>
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Back to tools">
          <AppSymbol name="back" size={22} tintColor={editorTheme.text} />
        </TouchableOpacity>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          directionalLockEnabled
          contentContainerStyle={styles.row}
          style={styles.scroll}
        >
          {BACKGROUND_TOOLS.map((tool) => {
            const active = activeTool === tool.id;
            const disabled = tool.id === 'image' || tool.id === 'brand';
            return (
              <TouchableOpacity
                key={tool.id}
                style={[styles.item, disabled && styles.itemDisabled]}
                onPress={() => onSelectTool(tool.id)}
                disabled={disabled}
                accessibilityLabel={tool.label}
                accessibilityState={{ selected: active }}
              >
                <AppSymbol
                  name={TOOL_SYMBOLS[tool.id]}
                  size={22}
                  tintColor={
                    active
                      ? editorTheme.accent
                      : disabled
                        ? editorTheme.textMuted
                        : editorTheme.text
                  }
                />
                <Text
                  style={[
                    styles.label,
                    active && styles.labelActive,
                    disabled && styles.labelDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {tool.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: STUDIO_TOOLBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: editorTheme.border,
    backgroundColor: editorTheme.surface,
    zIndex: 10,
    elevation: 10,
  },
  backBtn: {
    width: 44,
    height: STUDIO_TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: editorTheme.border,
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    height: STUDIO_TOOLBAR_HEIGHT,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  item: {
    minWidth: STUDIO_TOOLBAR_ITEM_MIN_WIDTH,
    height: STUDIO_TOOLBAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    color: editorTheme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: STUDIO_TOOLBAR_ITEM_MIN_WIDTH,
  },
  labelActive: {
    color: editorTheme.accent,
    fontWeight: '700',
  },
  labelDisabled: {
    color: editorTheme.textMuted,
  },
});
