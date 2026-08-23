#!/usr/bin/env bash
# 本地构建 4 个 CPU 架构的 Kaku preview APK 并发布到 GitHub Release。
# 不消耗 EAS 云端构建额度。产物用 debug 签名（与本机之前安装的 preview 签名不同，需卸载重装）。
#
# 用法：
#   bash scripts/build-split-apks.sh [tag]   # 例如 v1.0.7（默认取 app.config.js 里的版本并加 v 前缀）
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_DIR/apps/mobile"
OUT_DIR="$MOBILE_DIR/dist-split"
ABIS=(arm64-v8a armeabi-v7a x86 x86_64)
VERSION="$(node -e "process.stdout.write(require('./app.config.js').expo.version)")"
TAG="${1:-v${VERSION}}"

cd "$MOBILE_DIR"

echo "==> 导出 EXPO_PUBLIC_* 环境变量（让 JS bundle 内联 DSN 等）"
set -a
. ./.env 2>/dev/null || true
set +a

echo "==> 同步原生工程（expo prebuild）"
pnpm exec expo prebuild --platform android --no-install >/dev/null

echo "==> 禁用本地 Sentry sourcemap 上传（保留给 EAS 云端构建）"
sed -i '' 's#^apply from: new File(\["node".*#// sentry disabled for local build#' android/app/build.gradle

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

for abi in "${ABIS[@]}"; do
  echo "==> 构建 $abi"
  (cd android && ./gradlew :app:assembleRelease "-PreactNativeArchitectures=$abi" -q)
  cp android/app/build/outputs/apk/release/app-release.apk "$OUT_DIR/kaku-$abi.apk"
  du -h "$OUT_DIR/kaku-$abi.apk" | sed 's/^/    /'
done

echo "==> 发布 tag=$TAG"
gh release create "$TAG" "$OUT_DIR"/kaku-*.apk --repo shqingda/kaku \
  --title "$TAG" \
  --notes "Kaku Android v${VERSION} preview APKs split by CPU architecture. Pick the build matching your device:

- **kaku-arm64-v8a.apk** — most phones from 2021 onwards
- **kaku-armeabi-v7a.apk** — older 32-bit devices
- **kaku-x86_64.apk** / **kaku-x86.apk** — Android emulators

Please uninstall any previous Kaku before installing (signing keys differ). All features are free."

echo "==> 完成: https://github.com/shqingda/kaku/releases/tag/$TAG"
