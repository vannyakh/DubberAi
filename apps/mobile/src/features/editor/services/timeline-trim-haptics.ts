import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function runHaptic(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // expo-haptics requires a native rebuild after install; ignore if unavailable.
  }
}

/** Light tick when grabbing a timeline trim handle. */
export function triggerTimelineTrimGrabHaptic(): void {
  if (Platform.OS === 'android') {
    void runHaptic(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick),
    );
    return;
  }
  void runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Tick when a trim edge snaps to playhead, clip boundary, or ruler tick. */
export function triggerTimelineTrimSnapHaptic(): void {
  if (Platform.OS === 'android') {
    void runHaptic(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick),
    );
    return;
  }
  void runHaptic(() => Haptics.selectionAsync());
}
