#!/usr/bin/env bash
# 本地与 GitHub CI 共用的质量检查；不构建原生包、不发布、不操作设备。
set -euo pipefail
GROUP="${1:-all}"
if (( $# > 1 )) || [[ "$GROUP" != all && "$GROUP" != verify && "$GROUP" != html ]]; then
  echo '用法: pnpm ci:check [all|verify|html]' >&2
  exit 2
fi
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"
export CI=1
export EXPO_PUBLIC_KAKU_API_URL="${EXPO_PUBLIC_KAKU_API_URL:-https://kaku-api.shqingda.workers.dev}"
export SENTRY_DISABLE_AUTO_UPLOAD=true

run() {
  printf '\n>>> %s\n' "$*"
  if "$@"; then return 0; else
    local status=$?
    printf '\n检查失败（退出码 %s）：%s\n' "$status" "$*" >&2
    return "$status"
  fi
}

run pnpm install --frozen-lockfile
if [[ "$GROUP" != html ]]; then
  run pnpm --filter @kaku/mobile exec expo install --check
  (cd apps/mobile && run pnpm dlx expo-doctor)
  run pnpm typecheck
  run pnpm test
  run pnpm test:tooling
  run pnpm --filter @kaku/api test:coverage
  run pnpm --filter @kaku/mobile test:coverage
  run pnpm --filter @kaku/mobile test:ui
  BUNDLE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kaku-ci.XXXXXX")"
  trap 'rm -rf "$BUNDLE_DIR"' EXIT
  run pnpm --filter @kaku/mobile exec expo export --platform ios --output-dir "$BUNDLE_DIR/ios"
  run pnpm --filter @kaku/mobile exec expo export --platform android --output-dir "$BUNDLE_DIR/android"
  run pnpm build:web
fi
if [[ "$GROUP" != verify ]]; then
  run pnpm --filter @kaku/api test:html-parsers
fi
printf '\n全部检查通过（%s）。原生构建与实机验证需另行执行。\n' "$GROUP"
