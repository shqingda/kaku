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

## Where to look

- Product and how to run: `README.md`
- Remaining work: `TODO.md`
- Android GitHub / Play releases: `RELEASE.md`
- API deploy: `docs/deploy-api.md`
- How to test: `docs/testing.md`

Unset `http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`
before `git push`, GitHub Release, EAS, or wrangler. Clash will hang those
connections.
