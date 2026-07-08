import { useEffect } from "react";
import { useKeybindingsStore } from "@/actions/keybindings-store";
import { isAutoCutBusy, useAutoCutStore } from "./autocut-store";

const AUTOCUT_OVERLAY_ID = "autocut-pipeline";

/** Block editor shortcuts while Auto Cut is running. */
export function useAutoCutKeyblock() {
	const status = useAutoCutStore((state) => state.status);
	const { openOverlay, closeOverlay } = useKeybindingsStore();

	useEffect(() => {
		if (!isAutoCutBusy(status)) return;
		openOverlay(AUTOCUT_OVERLAY_ID);
		return () => closeOverlay(AUTOCUT_OVERLAY_ID);
	}, [status, openOverlay, closeOverlay]);
}
