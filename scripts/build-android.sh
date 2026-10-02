#!/usr/bin/env bash
# 纯本地构建，不同步更新日志、不提交、不推送、不发布。
# 用法：bash scripts/build-android.sh [release|debug] [--optimized]
set -euo pipefail
CHANNEL="${1:-release}"
OPTIMIZED="${2:-}"
if [[ "$CHANNEL" != release && "$CHANNEL" != debug ]] ||
   [[ -n "$OPTIMIZED" && "$OPTIMIZED" != --optimized ]] || (( $# > 2 )); then
  echo "用法: $0 [release|debug] [--optimized]" >&2
  exit 2
fi
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR/apps/mobile"
set -a
if [[ -f .env ]]; then source .env; fi
set +a
export EAS_BUILD_PROFILE=
if [[ "$CHANNEL" == release ]]; then export EAS_BUILD_PROFILE=production; fi
export KAKU_UPDATE_CHANNEL=github
export KAKU_OPTIMIZE_NATIVE=0
SUFFIX=
if [[ "$OPTIMIZED" == --optimized ]]; then
  export KAKU_OPTIMIZE_NATIVE=1
  SUFFIX=-optimized
fi
# 本地不上传 sourcemap，保留运行时 Sentry 与现有签名。
export SENTRY_DISABLE_AUTO_UPLOAD=true

# 保留仓库声明的依赖版本；现有 scripts 已满足 Expo prebuild 要求。
SKIP_DEPENDENCIES="$(node -e 'const p=require("./package.json"); for (const [key,value] of Object.entries({ios:"expo run:ios",android:"expo run:android"})) { if(p.scripts?.[key]!==value) throw new Error("请先显式配置 Expo 原生启动脚本: "+key); } process.stdout.write(Object.keys(p.dependencies).join(","))')"
pnpm exec expo prebuild --platform android --no-install --skip-dependency-update "$SKIP_DEPENDENCIES"
(
  cd android
  ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
)
mkdir -p dist-split
APK="dist-split/kaku-${CHANNEL}${SUFFIX}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$APK"
python3 "$REPO_DIR/scripts/report-apk-size.py" "$APK"
