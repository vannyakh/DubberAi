import { useCallback, useState } from 'react';

/** Shared open/close state for the in-app media library modal. */
export function useMediaPicker() {
  const [visible, setVisible] = useState(false);
  const [adding, setAdding] = useState(false);

  const openPicker = useCallback(() => {
    if (adding) return;
    setVisible(true);
  }, [adding]);

  const closePicker = useCallback(() => {
    if (adding) return;
    setVisible(false);
  }, [adding]);

  return {
    visible,
    adding,
    setAdding,
    openPicker,
    closePicker,
  };
}
