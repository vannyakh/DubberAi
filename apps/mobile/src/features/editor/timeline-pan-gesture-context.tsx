import { createContext, useContext } from 'react';
import type { GestureType } from 'react-native-gesture-handler';

export const TimelinePanGestureContext = createContext<GestureType | null>(null);

export function useTimelinePanGesture() {
  return useContext(TimelinePanGestureContext);
}
