#!/usr/bin/env bash
# 纯本地构建，不同步更新日志、不提交、不推送、不发布。
# 用法：bash scripts/build-android.sh [release|debug] [--optimized|--no-optimize]
set -euo pipefail
CHANNEL="${1:-release}"
OPTIMIZATION="${2:-}"
if [[ "$CHANNEL" != release && "$CHANNEL" != debug ]] ||
   [[ -n "$OPTIMIZATION" && "$OPTIMIZATION" != --optimized && "$OPTIMIZATION" != --no-optimize ]] ||
   [[ "$CHANNEL" == debug && "$OPTIMIZATION" == --optimized ]] || (( $# > 2 )); then
  echo "用法: $0 [release|debug] [--optimized|--no-optimize]（--optimized 仅限 release）" >&2
  exit 2
fi
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR/apps/mobile"
set -a
if [[ -f .env ]]; then source .env; fi
set +a
export EXPO_PUBLIC_KAKU_API_URL="${EXPO_PUBLIC_KAKU_API_URL:-https://kaku-api.shqingda.workers.dev}"
export KAKU_BUILD_PROFILE=
if [[ "$CHANNEL" == release ]]; then export KAKU_BUILD_PROFILE=production; fi
if [[ "$CHANNEL" == release ]]; then bash "$REPO_DIR/scripts/sign-android-release.sh" --check; fi
export KAKU_UPDATE_CHANNEL=github
export KAKU_OPTIMIZE_NATIVE=0
if [[ "$CHANNEL" == release ]]; then export KAKU_OPTIMIZE_NATIVE=1; fi
SUFFIX=
if [[ "$OPTIMIZATION" == --optimized ]]; then
  # 保留旧入口与文件名；默认 release 已启用相同优化。
  SUFFIX=-optimized
elif [[ "$OPTIMIZATION" == --no-optimize ]]; then
  export KAKU_OPTIMIZE_NATIVE=0
  SUFFIX=-unoptimized
fi
# 本地不上传 sourcemap，保留运行时 Sentry。
export SENTRY_DISABLE_AUTO_UPLOAD=true

# 保留仓库声明的依赖版本；现有 scripts 已满足 Expo prebuild 要求。
SKIP_DEPENDENCIES="$(node -e 'const p=require("./package.json"); const prefix="EXPO_PUBLIC_KAKU_API_URL=${EXPO_PUBLIC_KAKU_API_URL:-https://kaku-api.shqingda.workers.dev} "; for (const [key,value] of Object.entries({ios:"expo run:ios",android:"expo run:android"})) { if(![value,prefix+value].includes(p.scripts?.[key])) throw new Error("请先显式配置 Expo 原生启动脚本: "+key); } process.stdout.write(Object.keys(p.dependencies).join(","))')"
pnpm exec expo prebuild --platform android --no-install --skip-dependency-update "$SKIP_DEPENDENCIES"
(
  cd android
  ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
)
mkdir -p dist-split
APK="dist-split/kaku-${CHANNEL}${SUFFIX}.apk"
if [[ "$CHANNEL" == release ]]; then
  bash "$REPO_DIR/scripts/sign-android-release.sh" android/app/build/outputs/apk/release/app-release.apk "$APK"
else
  cp android/app/build/outputs/apk/release/app-release.apk "$APK"
fi
python3 "$REPO_DIR/scripts/report-apk-size.py" "$APK"

APP_VERSION="$(node -p "require('./app.config.js').expo.version")"
python3 "$REPO_DIR/scripts/record-android-artifact.py" "$APK" --version "$APP_VERSION"
