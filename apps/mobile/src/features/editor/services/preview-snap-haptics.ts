import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function runHaptic(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // expo-haptics requires a native rebuild after install; ignore if unavailable.
  }
}

/** Light tick when preview canvas alignment snaps (center/edge guides). */
export function triggerPreviewSnapHaptic(): void {
  if (Platform.OS === 'android') {
    void runHaptic(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick),
    );
    return;
  }
  void runHaptic(() => Haptics.selectionAsync());
}

/** Softer tick when rotation snaps to 90° increments. */
export function triggerPreviewRotationSnapHaptic(): void {
  if (Platform.OS === 'android') {
    void runHaptic(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick),
    );
    return;
  }
  void runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
