import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppSymbol } from '@/components';
import { fontSizes, spacing } from '@/constants';
import { mediaPickerTheme } from '@/constants/media-picker-theme';
import {
  fetchMediaPage,
  formatAssetDuration,
  isVideoAsset,
  LibraryAsset,
  MediaPickerTab,
  requestMediaLibraryAccess,
} from '../services/media-library';

const TABS: { id: MediaPickerTab; label: string }[] = [
  { id: 'videos', label: 'Videos' },
  { id: 'photos', label: 'Photos' },
  { id: 'live', label: 'Live Photos' },
];

const GRID_GAP = 2;
const NUM_COLUMNS = 3;

interface Props {
  visible: boolean;
  adding?: boolean;
  onClose: () => void;
  onConfirm: (assets: LibraryAsset[]) => void;
}

function MediaPickerContent({ visible, adding = false, onClose, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const cellSize = useMemo(
    () => (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
    [screenWidth],
  );

  const [tab, setTab] = useState<MediaPickerTab>('videos');
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedCount = selectedIds.size;

  const loadPage = useCallback(async (nextTab: MediaPickerTab, reset: boolean) => {
    setLoading(true);
    try {
      const page = await fetchMediaPage(nextTab, reset ? undefined : cursor);
      setAssets((prev) => (reset ? page.assets : [...prev, ...page.assets]));
      setCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  const openPicker = useCallback(async () => {
    setTab('videos');
    setSelectedIds(new Set());
    setAssets([]);
    setCursor(undefined);
    setHasNextPage(true);
    setPermissionDenied(false);

    const granted = await requestMediaLibraryAccess();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchMediaPage('videos');
      setAssets(page.assets);
      setCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void openPicker();
  }, [visible, openPicker]);

  const switchTab = async (next: MediaPickerTab) => {
    if (next === tab) return;
    setTab(next);
    setAssets([]);
    setCursor(undefined);
    setHasNextPage(true);
    setLoading(true);
    try {
      const page = await fetchMediaPage(next);
      setAssets(page.assets);
      setCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const picked = assets.filter((a) => selectedIds.has(a.id));
    if (picked.length === 0) return;
    onConfirm(picked);
  };

  const handleEndReached = () => {
    if (loading || !hasNextPage) return;
    void loadPage(tab, false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn} accessibilityLabel="Close">
            <AppSymbol name="close" size={22} tintColor={mediaPickerTheme.text} />
          </Pressable>
          <Pressable style={styles.albumBtn} accessibilityLabel="Recents album">
            <Text style={styles.albumLabel}>Recents</Text>
            <AppSymbol name="chevronDown" size={14} tintColor={mediaPickerTheme.textMuted} />
          </Pressable>
          <Pressable style={styles.headerBtn} accessibilityLabel="Open system library">
            <Text style={styles.libraryLink}>Library</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                style={styles.tab}
                onPress={() => void switchTab(item.id)}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
                {active ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>

        {permissionDenied ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Photo access needed</Text>
            <Text style={styles.emptyBody}>Allow access to your library to choose footage for a new project.</Text>
          </View>
        ) : (
          <FlashList
            data={assets}
            numColumns={NUM_COLUMNS}
            keyExtractor={(item) => item.id}
            extraData={selectedIds}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.centered}>
                  <Text style={styles.emptyTitle}>No {tab === 'live' ? 'live photos' : tab}</Text>
                  <Text style={styles.emptyBody}>Try another tab or add media to your library.</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loading ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={mediaPickerTheme.tabActive} />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const selected = selectedIds.has(item.id);
              const showDuration = isVideoAsset(item);
              const marginRight = index % NUM_COLUMNS < NUM_COLUMNS - 1 ? GRID_GAP : 0;

              return (
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={[styles.cell, { width: cellSize, height: cellSize, marginRight, marginBottom: GRID_GAP }]}
                  accessibilityState={{ selected }}
                >
                  <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" recyclingKey={item.id} />
                  {showDuration && item.duration > 0 ? (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{formatAssetDuration(item.duration)}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.selectRing, selected && styles.selectRingActive]}>
                    {selected ? <View style={styles.selectDot} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Pressable
            style={[
              styles.addBtn,
              selectedCount > 0 && !adding ? styles.addBtnEnabled : styles.addBtnDisabled,
            ]}
            disabled={selectedCount === 0 || adding}
            onPress={handleAdd}
            accessibilityLabel="Add selected media"
          >
            {adding ? (
              <ActivityIndicator color={mediaPickerTheme.addEnabledText} />
            ) : (
              <Text
                style={[
                  styles.addLabel,
                  selectedCount > 0 ? styles.addLabelEnabled : styles.addLabelDisabled,
                ]}
              >
                Add{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
  );
}

export function MediaPickerModal({ visible, adding = false, onClose, onConfirm }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <MediaPickerContent visible={visible} adding={adding} onClose={onClose} onConfirm={onConfirm} />
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mediaPickerTheme.background,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerBtn: {
    width: 72,
    justifyContent: 'center',
  },
  albumBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  albumLabel: {
    color: mediaPickerTheme.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  libraryLink: {
    color: mediaPickerTheme.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mediaPickerTheme.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabLabel: {
    color: mediaPickerTheme.tabInactive,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: mediaPickerTheme.tabActive,
    fontWeight: '700',
  },
  tabIndicator: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: mediaPickerTheme.tabActive,
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingTop: GRID_GAP,
  },
  cell: {
    overflow: 'hidden',
    backgroundColor: mediaPickerTheme.surface,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  durationText: {
    color: mediaPickerTheme.text,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  selectRing: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: mediaPickerTheme.selectionRing,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  selectRingActive: {
    borderColor: mediaPickerTheme.selectionFill,
    backgroundColor: mediaPickerTheme.selectionFill,
  },
  selectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: mediaPickerTheme.background,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: mediaPickerTheme.border,
    backgroundColor: mediaPickerTheme.background,
    alignItems: 'flex-end',
  },
  addBtn: {
    minWidth: 88,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  addBtnEnabled: {
    backgroundColor: mediaPickerTheme.addEnabled,
  },
  addBtnDisabled: {
    backgroundColor: mediaPickerTheme.addDisabled,
  },
  addLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  addLabelEnabled: {
    color: mediaPickerTheme.addEnabledText,
  },
  addLabelDisabled: {
    color: mediaPickerTheme.addDisabledText,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    color: mediaPickerTheme.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  emptyBody: {
    color: mediaPickerTheme.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
  },
});
