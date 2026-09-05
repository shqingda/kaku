#!/usr/bin/env bash
# 本地构建单一 arm64-v8a APK 并发布到 GitHub Release。
# 不消耗 EAS 云端构建额度。产物用 debug 签名（与 EAS / 旧包签名不同，需卸载重装）。
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
OUT_DIR="$MOBILE_DIR/dist-split"
NOTES_FILE="$REPO_DIR/scripts/release-notes.md"
ABI="arm64-v8a"

cd "$MOBILE_DIR"

echo "==> 导出 EXPO_PUBLIC_* 环境变量（让 JS bundle 内联 DSN 等）"
set -a
# shellcheck disable=SC1091
. ./.env 2>/dev/null || true
set +a

VERSION="$(node -e "process.stdout.write(require('./app.config.js').expo.version)")"
TAG="${1:-v${VERSION}}"
CHANNEL="${2:-release}"

case "${CHANNEL}" in
  debug)
    export EAS_BUILD_PROFILE=
    ;;
  release)
    export EAS_BUILD_PROFILE=production
    ;;
  *)
    echo "channel 只能是 debug 或 release，收到: ${CHANNEL}" >&2
    exit 1
    ;;
esac

if [[ "$TAG" != "v$VERSION" ]]; then echo "tag 必须是 v$VERSION" >&2; exit 2; fi
APK_NAME="kaku-${CHANNEL}.apk"

if [[ ! -s "${NOTES_FILE}" ]]; then
  echo "缺少发版说明 ${NOTES_FILE}，请先按 ReSource 格式写好再构建。" >&2
  exit 1
fi

echo "==> 同步 App 内更新日志（从 ${NOTES_FILE} 写入 changelog-data.ts）"
node "${REPO_DIR}/scripts/sync-changelog.mjs"
if ! git -C "${REPO_DIR}" diff --quiet -- apps/mobile/src/features/changelog/changelog-data.ts; then
  git -C "${REPO_DIR}" add apps/mobile/src/features/changelog/changelog-data.ts
  git -C "${REPO_DIR}" commit -m "chore(release): sync in-app changelog for ${TAG}"
fi

echo "==> 同步原生工程 (expo prebuild, channel=${CHANNEL})"
pnpm exec expo prebuild --platform android --no-install >/dev/null

echo "==> 禁用本地 Sentry sourcemap 上传（保留给 EAS 云端构建）"
sed -i '' 's#^apply from: new File(\["node".*#// sentry disabled for local build#' android/app/build.gradle

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

echo "==> 构建 ${ABI} -> ${APK_NAME}"
(cd android && ./gradlew :app:assembleRelease "-PreactNativeArchitectures=${ABI}" -q)
cp android/app/build/outputs/apk/release/app-release.apk "${OUT_DIR}/${APK_NAME}"
du -h "${OUT_DIR}/${APK_NAME}" | sed 's/^/    /'

if [[ "$BUILD_ONLY" == true ]]; then
  echo "==> 仅构建完成，未推送、未创建 Release"
  exit 0
fi

echo "==> 推送 origin/main（Release tag 必须落在已上传的提交上）"
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
git -C "${REPO_DIR}" push origin HEAD:main

echo "==> 发布 tag=${TAG} asset=${APK_NAME}"
gh release create "${TAG}" "${OUT_DIR}/${APK_NAME}" --repo shqingda/kaku \
  --title "${TAG}" \
  --notes-file "${NOTES_FILE}" \
  --target "$(git -C "${REPO_DIR}" rev-parse HEAD)"

echo "==> 完成: https://github.com/shqingda/kaku/releases/tag/${TAG}"
