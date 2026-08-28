# Kaku collaboration rules

This repository is both a product and a learning project.

- Implement one small vertical slice at a time.
- Before a non-trivial design choice, explain the problem in plain Chinese and give one recommendation.
- Follow Apple Design principles: motion must start from the current on-screen value,
  inherit the user's velocity, project momentum forward, and be interruptible at any
  moment; prefer springs over fixed-duration animations for anything a user can touch;
  feedback happens on pointer-down and is continuous during the interaction; every
  screen keeps consistent spacing and breathing room. The apple-design skill is the
  reference.
- Prefer code the owner can explain in an interview over clever abstractions.
- Keep the product provider-neutral. Bangumi is an adapter, not the domain model.
- Never hide failures behind a blank loading state. Offline, retrying, and failed states must be explicit.
- Let Codex handle staging, commits, and pushes. Before every commit, inspect the
  complete diff, exclude generated or sensitive files, run the relevant checks,
  and summarize the resulting commit and remote branch. The user has opted in to
  automatic commits by default: after completing a change, commit it without
  waiting for confirmation (push still requires an explicit request).
- Worklets: gesture and animation callbacks run on the UI runtime and may only call
  module-level functions marked `'worklet'`, or inline code. Component-scope helper
  functions are NOT reliably workletized under React Compiler — never call them from
  a worklet; inline the logic or move it to a module.

## Releasing Android (发版)

Before any deployment, read `RELEASE.md` — it documents both release paths.

- **日常迭代发 GitHub 包**：use the local build script
  `bash scripts/build-split-apks.sh android-1.0.0-<n> [debug|preview|release]` —
  it does NOT consume the monthly EAS free-build quota. Builds **arm64-v8a only**,
  names the APK `kaku-<channel>.apk` (default `kaku-release.apk`), debug signing
  (users must uninstall the previous build first). Write `scripts/release-notes.md`
  first (Chinese bullets, ReSource style). ~10–15 min on the local machine.
- **正式上架 Play**：use EAS cloud `production` profile (AAB, EAS signing, Sentry
  source maps). Via GitHub Actions workflow `Release Android APK` (needs repo secret
  `EXPO_TOKEN`).
- **EAS quota** is limited per month (resets ~Sep 1). When exhausted, cloud builds
  fail; fall back to the local script.
- **Proxy gotcha**: unset `http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy
  ALL_PROXY` before `git push` or EAS uploads, otherwise connections hang.
- ABI control uses RN's `-PreactNativeArchitectures` (Expo SDK 57 removed
  `android.abiFilters` / `expo-build-properties` ABI support — do not re-add them).
- Local builds disable Sentry source-map upload but inline the DSN (crash reporting
  still works); EAS builds upload source maps.
- Release notes are written in English.
