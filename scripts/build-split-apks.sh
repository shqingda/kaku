#!/usr/bin/env bash
# 本地构建单一 arm64-v8a APK 并发布到 GitHub Release。
# 不消耗 EAS 云端构建额度。产物用 debug 签名（与 EAS / 旧包签名不同，需卸载重装）。
#
# 用法：
#   bash scripts/build-split-apks.sh [tag] [channel]
#   tag     例如 android-1.0.0-9（默认 v<app.config.js 版本>）
#   channel debug | preview | release（默认 release）
#           产物名为 kaku-<channel>.apk
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_DIR/apps/mobile"
OUT_DIR="$MOBILE_DIR/dist-split"
NOTES_FILE="$REPO_DIR/scripts/release-notes.md"
ABI="arm64-v8a"

cd "$MOBILE_DIR"

VERSION="$(node -e "process.stdout.write(require('./app.config.js').expo.version)")"
TAG="${1:-v${VERSION}}"
CHANNEL="${2:-release}"

case "$CHANNEL" in
  debug)
    export EAS_BUILD_PROFILE=
    ;;
  preview)
    export EAS_BUILD_PROFILE=preview
    ;;
  release)
    export EAS_BUILD_PROFILE=production
    ;;
  *)
    echo "channel 只能是 debug、preview 或 release，收到：$CHANNEL" >&2
    exit 1
    ;;
esac

APK_NAME="kaku-${CHANNEL}.apk"

if [[ ! -s "$NOTES_FILE" ]]; then
  echo "缺少发版说明 $NOTES_FILE，请先按 ReSource 格式写好再构建。" >&2
  exit 1
fi

echo "==> 导出 EXPO_PUBLIC_* 环境变量（让 JS bundle 内联 DSN 等）"
set -a
. ./.env 2>/dev/null || true
set +a

echo "==> 同步原生工程（expo prebuild，channel=$CHANNEL）"
pnpm exec expo prebuild --platform android --no-install >/dev/null

echo "==> 禁用本地 Sentry sourcemap 上传（保留给 EAS 云端构建）"
sed -i '' 's#^apply from: new File(\["node".*#// sentry disabled for local build#' android/app/build.gradle

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "==> 构建 $ABI → $APK_NAME"
(cd android && ./gradlew :app:assembleRelease "-PreactNativeArchitectures=$ABI" -q)
cp android/app/build/outputs/apk/release/app-release.apk "$OUT_DIR/$APK_NAME"
du -h "$OUT_DIR/$APK_NAME" | sed 's/^/    /'

echo "==> 发布 tag=$TAG asset=$APK_NAME"
gh release create "$TAG" "$OUT_DIR/$APK_NAME" --repo shqingda/kaku \
  --title "$TAG" \
  --notes-file "$NOTES_FILE"

echo "==> 完成: https://github.com/shqingda/kaku/releases/tag/$TAG"
