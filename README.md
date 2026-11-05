English · [简体中文](README.zh-CN.md)

# Kaku

Kaku is a third-party Bangumi client for iOS and Android (Expo / React Native / TypeScript). Public data needs no login; collections, progress, and ratings follow the Bangumi account.

[Latest release](https://github.com/shqingda/kaku/releases/latest) · [Docs](docs/README.md) · [TODO](TODO.md)

## Status

| App | Role | Status |
| --- | --- | --- |
| `apps/mobile` | Expo client | iOS / Android testing; packages on [Releases](https://github.com/shqingda/kaku/releases/latest) |
| `apps/api` | OAuth, sessions, write proxy, preferences / push / cache | Cloudflare Workers |
| `apps/web` | Product site, privacy, terms, FAQ | Cloudflare Workers |

Not on App Store / Play. The latest recorded release is [v1.1.26](docs/test-records/2026-11-05-release-1.1.26.md); its build checks passed, while Android device verification remains pending. Day-to-day Android testing uses a local release APK. Android CI builds require explicit release intent; GitHub Releases distributes published packages. See [Release](docs/deployment/release.md).

## Features

Browse subjects, people, catalogs, rankings, and timelines. Sync Bangumi watch states and episode progress. Comments, reviews, boards, friend feed, notifications (optional push). OAuth sessions have a dedicated device-management page; theme sync and automatic offline packs remain available. Local error records support diagnostics internally; the app has no offline-pack management or error-log sharing screen.

Not open yet: join / leave groups, delete your own timeline posts, character / person collection entry points. Details and remaining work: [TODO](TODO.md).

## Security

Bangumi passwords stay on Bangumi. `client_secret` and OAuth tokens stay on the server. The app exchanges a one-time handoff code for its Kaku session. Tokens in D1 are AES-GCM encrypted; Kaku refresh tokens are hashed. Users can sign out on the current device or revoke other device sessions. The app no longer exposes a Bangumi disconnect action.

## Develop

Node.js 26.12.1+, pnpm 12.14.0. iOS needs Xcode; Android needs SDK or a debuggable device.

```sh
pnpm install
pnpm dev:mobile
```

For the local iOS simulator in Codex, run `pnpm dev:sim`, then open the preview
in the in-app browser. See [simulator setup and input recovery](docs/development/ios-simulator.md).

Rebuild the native client after first install or native dependency changes:

```sh
pnpm --filter @kaku/mobile ios
pnpm --filter @kaku/mobile android
```

**API**

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @kaku/api db:migrate:local
pnpm dev:api
```

**Site:** `pnpm dev:web`

[Architecture](docs/architecture.md) · [Testing](docs/development/testing.md) · [API deploy](docs/deployment/deploy-api.md)

## Docs

- [Docs index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Testing](docs/development/testing.md)
- [Release](docs/deployment/release.md)
- [API deploy](docs/deployment/deploy-api.md)
- [Interview notes](docs/learning/kaku-project-experience.md)
