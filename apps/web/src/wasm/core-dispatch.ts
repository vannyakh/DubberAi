/**
 * Runtime dispatch for the shared Rust core.
 *
 * Vite aliases the bare `opencut-wasm` specifier to this module (see
 * vite.config.ts). It re-exports the real WASM module unchanged, but when
 * running inside the Electron desktop app — where the preload exposes the
 * native addon as `window.desktopCore` (rust/node, no WASM/JS overhead) —
 * the time functions below are served natively instead.
 *
 * The GPU compositor exports always come from the WASM module: wgpu runs on
 * WebGPU, which is hardware-accelerated in Electron already.
 */
import * as wasm from 'opencut-wasm/opencut_wasm';

export * from 'opencut-wasm/opencut_wasm';
export { default } from 'opencut-wasm/opencut_wasm';

interface NativeCore {
  ticksPerSecond(): number;
  mediaTimeFromSeconds(seconds: number): number | null;
  mediaTimeToSeconds(time: number): number;
  mediaTimeFromFrame(frame: number, rate: wasm.FrameRate): number | null;
  mediaTimeToFrame(time: number, rate: wasm.FrameRate): number | null;
  roundToFrame(time: number, rate: wasm.FrameRate): number | null;
  floorToFrame(time: number, rate: wasm.FrameRate): number | null;
  isFrameAligned(time: number, rate: wasm.FrameRate): boolean | null;
  lastFrameTime(duration: number, rate: wasm.FrameRate): number | null;
  snappedSeekTime(time: number, duration: number, rate: wasm.FrameRate): number | null;
  mediaTimeAdd(lhs: number, rhs: number): number;
  mediaTimeSub(lhs: number, rhs: number): number;
  mediaTimeMin(lhs: number, rhs: number): number;
  mediaTimeMax(lhs: number, rhs: number): number;
  mediaTimeClamp(time: number, min: number, max: number): number;
  formatTimecode(time: number, format?: string | null, rate?: wasm.FrameRate | null): string | null;
  parseTimecode(timeCode: string, format?: string | null, rate?: wasm.FrameRate | null): number | null;
  guessTimecodeFormat(timeCode: string): string | null;
}

const native: NativeCore | undefined = (globalThis as { desktopCore?: NativeCore }).desktopCore;

/** Convert napi's `null` to wasm-bindgen's `undefined`. */
const opt = <T>(value: T | null): T | undefined => value ?? undefined;

export const TICKS_PER_SECOND: typeof wasm.TICKS_PER_SECOND = native
  ? () => native.ticksPerSecond()
  : wasm.TICKS_PER_SECOND;

export const mediaTimeFromSeconds: typeof wasm.mediaTimeFromSeconds = native
  ? ({ seconds }) => opt(native.mediaTimeFromSeconds(seconds))
  : wasm.mediaTimeFromSeconds;

export const mediaTimeToSeconds: typeof wasm.mediaTimeToSeconds = native
  ? ({ time }) => native.mediaTimeToSeconds(time)
  : wasm.mediaTimeToSeconds;

export const mediaTimeFromFrame: typeof wasm.mediaTimeFromFrame = native
  ? ({ frame, rate }) => opt(native.mediaTimeFromFrame(Number(frame), rate))
  : wasm.mediaTimeFromFrame;

export const mediaTimeToFrame: typeof wasm.mediaTimeToFrame = native
  ? ({ time, rate }) => {
      const frame = native.mediaTimeToFrame(time, rate);
      return frame == null ? undefined : BigInt(frame);
    }
  : wasm.mediaTimeToFrame;

export const roundToFrame: typeof wasm.roundToFrame = native
  ? ({ time, rate }) => opt(native.roundToFrame(time, rate))
  : wasm.roundToFrame;

export const floorToFrame: typeof wasm.floorToFrame = native
  ? ({ time, rate }) => opt(native.floorToFrame(time, rate))
  : wasm.floorToFrame;

export const isFrameAligned: typeof wasm.isFrameAligned = native
  ? ({ time, rate }) => opt(native.isFrameAligned(time, rate))
  : wasm.isFrameAligned;

export const lastFrameTime: typeof wasm.lastFrameTime = native
  ? ({ duration, rate }) => opt(native.lastFrameTime(duration, rate))
  : wasm.lastFrameTime;

export const snappedSeekTime: typeof wasm.snappedSeekTime = native
  ? ({ time, duration, rate }) => opt(native.snappedSeekTime(time, duration, rate))
  : wasm.snappedSeekTime;

export const mediaTimeAdd: typeof wasm.mediaTimeAdd = native
  ? ({ lhs, rhs }) => native.mediaTimeAdd(lhs, rhs)
  : wasm.mediaTimeAdd;

export const mediaTimeSub: typeof wasm.mediaTimeSub = native
  ? ({ lhs, rhs }) => native.mediaTimeSub(lhs, rhs)
  : wasm.mediaTimeSub;

export const mediaTimeMin: typeof wasm.mediaTimeMin = native
  ? ({ lhs, rhs }) => native.mediaTimeMin(lhs, rhs)
  : wasm.mediaTimeMin;

export const mediaTimeMax: typeof wasm.mediaTimeMax = native
  ? ({ lhs, rhs }) => native.mediaTimeMax(lhs, rhs)
  : wasm.mediaTimeMax;

export const mediaTimeClamp: typeof wasm.mediaTimeClamp = native
  ? ({ time, min, max }) => native.mediaTimeClamp(time, min, max)
  : wasm.mediaTimeClamp;

export const formatTimecode: typeof wasm.formatTimecode = native
  ? ({ time, format, rate }) => opt(native.formatTimecode(time, format, rate))
  : wasm.formatTimecode;

export const parseTimecode: typeof wasm.parseTimecode = native
  ? ({ timeCode, format, rate }) => opt(native.parseTimecode(timeCode, format, rate))
  : wasm.parseTimecode;

export const guessTimecodeFormat: typeof wasm.guessTimecodeFormat = native
  ? ({ timeCode }) =>
      opt(native.guessTimecodeFormat(timeCode)) as ReturnType<typeof wasm.guessTimecodeFormat>
  : wasm.guessTimecodeFormat;
