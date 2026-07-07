# rust/

Shared Rust crates that power OpenCut across platforms (web via WASM, desktop natively).

## Adding a new crate

1. Create it under `rust/crates/`
2. Add `bridge` as a dependency
3. Annotate public functions with `#[export]`

## How `#[export]` works

```rust
use bridge::export;

#[export]
pub fn round_to_frame(time: f64, fps: f64) -> f64 {
    (time * fps).round() / fps
}
```

Without the `wasm` feature, the macro is a no-op. With `--features wasm`, it expands to:

```rust
#[wasm_bindgen(js_name = "roundToFrame")]
pub fn round_to_frame(time: f64, fps: f64) -> f64 { ... }
```

Desktop uses the crates natively through `rust/node` (`dubbercut-core`), a
napi-rs addon loaded in the Electron preload and exposed to the renderer as
`window.desktopCore`. The web UI's dispatch layer
(`apps/web/src/wasm/core-dispatch.ts`) prefers it over WASM at runtime, so the
same bundle runs WASM in browsers and native code on desktop.

Build it with `pnpm --filter @dubbercut/desktop build:core` (runs cargo and
copies the addon into `dist-electron/dubbercut_core.node`).

## Testing

```bash
cargo test -p <crate>
```
