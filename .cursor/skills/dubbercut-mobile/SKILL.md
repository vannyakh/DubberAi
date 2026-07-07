---
name: dubbercut-mobile
description: DubberCut Expo mobile app architecture, UI conventions, routing, auth modes, and native build notes. Use when working in apps/mobile, Expo Router tabs, auth screens, home UI, editor, ffmpeg-expo iOS patches, or when the user mentions DubberCut mobile.
---

# DubberCut Mobile

## Monorepo path
`apps/mobile` — package `@dubbercut/mobile`, entry `expo-router/entry`

## App modes
| Mode | Trigger | Projects | AI translation |
|------|---------|----------|----------------|
| `local` | "Get Started" / continue without account | `projects.json` on device | Disabled |
| `cloud` | Email sign-in | API via `@dubbercut/store` | Enabled |

Stores: `useAppStore` (mode), `useAuthStore`, `useProjectsStore`

## Routes
```
app/
  _layout.tsx              # Stack + Stack.Protected
  (tabs)/
    _layout.tsx            # NativeTabs (Home, Account)
    index.tsx              # ProjectsScreen
    settings.tsx           # AccountScreen
  login.tsx                # AuthWelcomeScreen
  login/email.tsx          # AuthEmailScreen
  editor/[id].tsx          # Video editor (dark UI)
```

## UI rules
1. **No emoji icons** — use `AppSymbol` (`@/components/ui/app-symbol`)
2. **Light tabs** — `appTheme`, `Screen variant="light"`
3. **Dark editor** — default `Screen`, `@dubbercut/design-system` darkTheme
4. **Auth** — `AuthScreenLayout` with safe area top; onboarding dark, email form light
5. **Native tabs** — `ThemeProvider` + `DefaultTheme`; web uses `_layout.web.tsx` headless tabs

## Key features
- **Home**: category pills, quick tools grid, project cards, create-project bottom sheet
- **Account**: grouped settings rows with symbols
- **Editor**: zustand store, expo-video + Skia, ffmpeg-expo export (patched)

## ffmpeg-expo iOS
Patch at repo root `patches/ffmpeg-expo@0.0.2.patch`. Source copies in `apps/mobile/patches/ffmpeg-expo/`. Podspec must use SDK-specific `LIBRARY_SEARCH_PATHS` (simulator vs device).

## Commands
```bash
cd apps/mobile && bun run lint
cd apps/mobile && bunx expo run:ios
```

## Related docs (fetch .md when needed)
- Native tabs: `https://docs.expo.dev/router/advanced/native-tabs/index.md`
- Auth: `https://docs.expo.dev/router/advanced/authentication/index.md`
- Symbols: `https://docs.expo.dev/versions/latest/sdk/symbols/index.md`
