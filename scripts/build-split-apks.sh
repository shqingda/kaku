#!/usr/bin/env bash
# 兼容旧参数的纯构建入口，不提交、不推送、不上传或发布。
# 不消耗 EAS 云端构建额度。正式包使用已登记的签名轮换证明。
#
# 用法：
#   bash scripts/build-split-apks.sh [tag] [channel] [--build-only]
#   tag         例如 v1.0.9（默认 v<app.config.js 版本>，不要用 android-1.0.0-n）
#   channel     debug | release（默认 release），产物名为 kaku-<channel>.apk
#   --build-only  只构建，不 push、不创建 GitHub Release
set -euo pipefail
BUILD_ONLY=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=true ;;
    --*) echo "未知参数: $arg" >&2; exit 2 ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done
if (( ${#POSITIONAL[@]} > 2 )); then echo "参数过多" >&2; exit 2; fi
if (( ${#POSITIONAL[@]} )); then set -- "${POSITIONAL[@]}"; else set --; fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_DIR/apps/mobile"

cd "$MOBILE_DIR"

echo "==> 导出 EXPO_PUBLIC_* 环境变量（让 JS bundle 内联 DSN 等）"
set -a
# shellcheck disable=SC1091
if [[ -f .env ]]; then source .env; fi
set +a
export EXPO_PUBLIC_KAKU_API_URL="${EXPO_PUBLIC_KAKU_API_URL:-https://kaku-api.shqingda.workers.dev}"

VERSION="$(node -e "process.stdout.write(require('./app.config.js').expo.version)")"
TAG="${1:-v${VERSION}}"
CHANNEL="${2:-release}"

case "${CHANNEL}" in
  debug)
    export KAKU_BUILD_PROFILE=
    ;;
  release)
    export KAKU_BUILD_PROFILE=production
    ;;
  *)
    echo "channel 只能是 debug 或 release，收到: ${CHANNEL}" >&2
    exit 1
    ;;
esac

if [[ "$TAG" != "v$VERSION" ]]; then echo "tag 必须是 v$VERSION" >&2; exit 2; fi
if [[ "$BUILD_ONLY" != true ]]; then
  echo "兼容入口仅构建；日志准备、上传和发布请按 docs/deployment/release.md 分步执行。"
fi
exec bash "${REPO_DIR}/scripts/build-android.sh" "$CHANNEL"
