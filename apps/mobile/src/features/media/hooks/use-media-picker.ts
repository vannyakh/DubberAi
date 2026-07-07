import { create } from 'zustand';

interface MediaPickerState {
  visible: boolean;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  openPicker: () => void;
  closePicker: () => void;
}

const useMediaPickerStore = create<MediaPickerState>((set, get) => ({
  visible: false,
  adding: false,
  setAdding: (adding) => set({ adding }),
  openPicker: () => {
    if (get().adding) return;
    set({ visible: true });
  },
  closePicker: () => {
    if (get().adding) return;
    set({ visible: false });
  },
}));

/** Shared open/close state for the in-app media library modal. */
export function useMediaPicker() {
  const visible = useMediaPickerStore((s) => s.visible);
  const adding = useMediaPickerStore((s) => s.adding);
  const setAdding = useMediaPickerStore((s) => s.setAdding);
  const openPicker = useMediaPickerStore((s) => s.openPicker);
  const closePicker = useMediaPickerStore((s) => s.closePicker);

  return {
    visible,
    adding,
    setAdding,
    openPicker,
    closePicker,
  };
}
