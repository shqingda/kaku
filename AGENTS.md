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
- Typography and spacing must use the `TYPE.` / `SPACING.` tokens from
  `apps/mobile/src/constants/design.ts`: new code never hard-codes `fontSize` or
  spacing numbers; when touching an existing screen, migrate its remaining raw
  values to tokens in passing.
- Prefer code the owner can explain in an interview over clever abstractions.
- Keep the product provider-neutral. Bangumi is an adapter, not the domain model.
- Never hide failures behind a blank loading state. Offline, retrying, and failed states must be explicit.
- Local iOS testing must reuse the existing iPhone 18 Pro (iOS 27.0), UDID
  `498E27B7-5192-48CE-9B13-F4A27F10F806`. List devices before use; if it is
  missing, report the blocker instead of creating or cloning another simulator.
  Never erase this device, uninstall Kaku, sign out, or clear its application data,
  keychain, history, or drafts for test setup. Skip tests that require a fresh guest
  device or destructive data cleanup, and report the skipped coverage.
  These rules apply to setup skills and test tools too; exceptions require a new
  explicit user instruction. Keep this device's PosterBoard wallpaper service
  disabled; do not change other simulator services. See
  `docs/development/argent-usage.md` for verification and recovery commands.
  User-authorized exception: `pnpm dev:sim` may run `serve-sim repair-input`
  when DeviceHub input shadowing is detected. This restarts backboardd / SpringBoard
  and reopens Kaku without clearing data; do not change other service settings.
- When the user says “打开 Kaku 模拟器”, run `pnpm dev:sim`, then open or reuse
  `http://localhost:3200/` in Codex's in-app browser and verify a real click.
  See `docs/development/ios-simulator.md` for lifecycle and troubleshooting.
- Let Codex handle staging, commits, and pushes. Before every commit, inspect the
  complete diff, exclude generated or sensitive files, run the relevant checks,
  and summarize the resulting commit and remote branch. The user has opted in to
  automatic commits by default: after completing a change, commit it without
  waiting for confirmation (push still requires an explicit request).
- Worklets: gesture and animation callbacks run on the UI runtime and may only call
  module-level functions marked `'worklet'`, or inline code. Component-scope helper
  functions are NOT reliably workletized under React Compiler — never call them from
  a worklet; inline the logic or move it to a module.

## Where to look

- Documentation index: `docs/README.md`
- Technical architecture: `docs/architecture.md`

- Product and how to run: `README.md`
- Remaining work: `TODO.md`
- Android GitHub / Play releases: `docs/deployment/release.md`
- API deploy: `docs/deployment/deploy-api.md`
- How to test: `docs/development/testing.md`

Unset `http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`
before `git push`, GitHub Release, EAS, or wrangler. Clash will hang those
connections.
