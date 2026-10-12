English · [简体中文](README.zh-CN.md)

# Kaku

Kaku is a third-party Bangumi client for iOS and Android, built with Expo, React Native, and TypeScript.

Start from [Docs](docs/README.md) for architecture, development, release, interview notes, and history.

## Status

| App | Role | Status |
| --- | --- | --- |
| `apps/mobile` | Expo / React Native client | iOS and Android in active testing; packages on [GitHub Releases](https://github.com/shqingda/kaku/releases/latest) |
| `apps/api` | OAuth, sessions, write proxy, preferences / push / public cache | Running on Cloudflare Workers |
| `apps/web` | Product site, privacy, terms, FAQ | Running on Cloudflare Workers |

Not on the App Store or Play yet. Day-to-day Android builds are local + GitHub Releases (local debug signing; same package name and signature can overwrite; old EAS-signed installs cannot). See [Release](docs/deployment/release.md).

## Features

Public data needs no login. Collections, progress, ratings, and other personal data follow the Bangumi account. Kaku does not keep a conflicting local collection.

### Browse and discover

- Search, daily broadcast, rankings, and category channels
- Anime, books, music, games, and real-world subjects
- Subject pages: rank, score, tags, related works, staff
- Characters and people, plus site-wide browse
- Tag index and wiki revision feed
- Public user profiles, collections, blogs, friends, and timeline
- Catalog discovery; create, edit, delete; follow / unfollow catalogs
- Recent search and recent browse (optional account sync)

### Collection and progress

- Bangumi watch states: want / watched / watching / on hold / dropped
- Episode progress sync for anime and real-world shows
- Grid and list episode views, long-series sections, prev / next
- Personal ratings synced to Bangumi
- Offline packs for recently opened subjects

### Community

- Short comments and long reviews
- Subject boards, episode threads, group topics
- Create subject and group topics; edit / delete your own replies
- Friend timeline read and post; open blog posts
- Add / remove friends; block / unblock users
- Report users, topics, and replies
- Bangumi notification list (all / unread) with optional push

### Account and system

- Bangumi OAuth; multi-device sessions; sign out one device or all
- Light / dark / system theme with cloud preference sync
- Network diagnostics against Bangumi hosts (status.bgm.tv is secondary)
- Local error log (shareable, no credentials) and in-app changelog
- Home-screen shortcuts; share subjects, blogs, topics, people, users, catalogs
- Clear offline / retry / unavailable states instead of blank loading

Not open yet: join / leave groups, delete your own timeline posts, character / person collection entry points. Upstream API and write-path review: [TODO](TODO.md). The mobile app has no i18n; the site has Chinese / English.

## Architecture

- Mobile: Expo / React Native, Expo Router, TanStack Query
- API: Hono on Cloudflare Workers, D1 for Kaku-owned data, Bangumi OAuth and personal writes proxied
- Site: React / Vite on Cloudflare Workers Static Assets

Details: [Architecture](docs/architecture.md).

## Security

- Bangumi passwords stay on Bangumi’s pages; Kaku never receives or stores them
- Bangumi `client_secret` and OAuth tokens stay on the server
- App login callback carries a short-lived one-time handoff code only
- Bangumi tokens are AES-GCM encrypted in D1; Kaku refresh tokens are stored hashed
- Users can revoke one device session, or disconnect Bangumi and wipe all Kaku sessions and credentials

## Develop

**Requirements.** Node.js 26.5+, pnpm 11, Xcode + iOS Simulator for iOS, Android SDK or a USB-debuggable device for Android.

```sh
pnpm install
```

**Mobile.**

```sh
pnpm dev:mobile
```

Rebuild the dev client after first install or native dependency changes:

```sh
pnpm --filter @kaku/mobile ios
pnpm --filter @kaku/mobile android
```

With an iOS client already installed: open the simulator, run `pnpm dev:mobile`, then `pnpm --filter @kaku/mobile open:ios` to attach Metro on port 8081. After Expo plugin changes, regenerate with `pnpm --filter @kaku/mobile exec expo prebuild --clean --platform ios`, rebuild the client, and restart Metro.

**API.**

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @kaku/api db:migrate:local
pnpm dev:api
```

`apps/api/.dev.vars` is local-only. Bangumi OAuth needs app id, secret, and callback. Generate `TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`. Production also needs `EXPO_ACCESS_TOKEN` for push; see [API deploy](docs/deployment/deploy-api.md).

**Site.**

```sh
pnpm dev:web
```

## Verify

```sh
pnpm typecheck
pnpm test
pnpm --filter @kaku/mobile test:coverage
pnpm --filter @kaku/api test:coverage
pnpm --filter @kaku/mobile test:ui
pnpm test:smoke
pnpm test:smoke:all
pnpm test:tooling
pnpm build:web
```

Layers: pure logic, components / hooks, Maestro. CI runs the first two plus coverage, JS bundle, and the site build. Maestro stays local. See [Testing](docs/development/testing.md).

## Docs

- [Docs index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Testing](docs/development/testing.md)
- [Release](docs/deployment/release.md)
- [API deploy](docs/deployment/deploy-api.md)
- [Interview notes](docs/learning/kaku-project-experience.md)
- [TODO](TODO.md)
- [AGENTS](AGENTS.md)

## Deploy

Finish local checks first. Sign in with Wrangler OAuth. Do not put secrets in commands, source, or commits. Clear proxy env vars when needed: `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY`.

```sh
pnpm --filter @kaku/api db:migrate:remote
pnpm --filter @kaku/api deploy:worker
pnpm --filter @kaku/web deploy
```

[API deploy](docs/deployment/deploy-api.md) · [Release](docs/deployment/release.md)
