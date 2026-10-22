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

Not on App Store / Play. Android day-to-day builds are local + GitHub Releases. See [Release](docs/deployment/release.md).

## Features

Browse subjects, people, catalogs, rankings, and timelines. Sync Bangumi watch states and episode progress. Comments, reviews, boards, friend feed, notifications (optional push). OAuth multi-device sessions, theme sync, offline packs for recent subjects, shareable local error logs.

Not open yet: join / leave groups, delete your own timeline posts, character / person collection entry points. Details and remaining work: [TODO](TODO.md).

## Security

Bangumi passwords stay on Bangumi. `client_secret` and OAuth tokens stay on the server. The app only receives a one-time handoff code. Tokens in D1 are AES-GCM encrypted; Kaku refresh tokens are hashed. Users can revoke one session or disconnect Bangumi and wipe credentials.

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
