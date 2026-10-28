#!/usr/bin/env bash
# Android 13+ 正式证书轮换；Android 10–12L 保留旧证书。私钥始终位于仓库外。
set -euo pipefail
SIGNING_DIR="${KAKU_SIGNING_DIR:-$HOME/.local/share/kaku-signing/2026-10-17-rotation}"
BUILD_TOOLS="${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools/37.0.0"
APKSIGNER="${KAKU_APKSIGNER:-$BUILD_TOOLS/apksigner}"
ZIPALIGN="${KAKU_ZIPALIGN:-$BUILD_TOOLS/zipalign}"
for file in legacy-debug.keystore release.p12 release-password.txt rotation.lineage; do
  if [[ ! -s "$SIGNING_DIR/$file" ]]; then
    echo "缺少发布签名文件：$SIGNING_DIR/$file；正式包不会回退到 Debug 签名。" >&2
    exit 1
  fi
done
if [[ ! -x "$APKSIGNER" || ! -x "$ZIPALIGN" ]]; then
  echo "需要 Android build-tools 37.0.0（apksigner / zipalign）。" >&2
  exit 1
fi
if [[ "${1:-}" == --check && $# == 1 ]]; then exit 0; fi
if [[ $# != 2 || ! -s "$1" ]]; then echo "用法：$0 <input.apk> <output.apk> 或 --check" >&2; exit 2; fi
INPUT="$1"
OUTPUT="$2"
TEMP_APK="$(mktemp "${OUTPUT}.signed.XXXXXX")"
trap 'rm -f "$TEMP_APK"' EXIT
"$APKSIGNER" sign \
  --ks "$SIGNING_DIR/legacy-debug.keystore" --ks-key-alias androiddebugkey --ks-pass pass:android \
  --next-signer --ks "$SIGNING_DIR/release.p12" --ks-key-alias kaku-release \
  --ks-pass "file:$SIGNING_DIR/release-password.txt" \
  --lineage "$SIGNING_DIR/rotation.lineage" --rotation-min-sdk-version 33 \
  --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true \
  --v4-signing-enabled false --out "$TEMP_APK" "$INPUT"
# 检查系统分段证书，防止误用其他私钥或丢失轮换配置。
for sdk in 29 32 33 36; do
  EXPECTED=fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
  if (( sdk >= 33 )); then EXPECTED=39ba0d1b81d5d64d9d086717415d07455c1521e4eea568289e949f713218e8b7; fi
  CERTIFICATES="$("$APKSIGNER" verify --min-sdk-version "$sdk" --max-sdk-version "$sdk" --print-certs "$TEMP_APK")"
  if ! printf '%s\n' "$CERTIFICATES" | grep -Fq "certificate SHA-256 digest: $EXPECTED"; then
    echo "Android API $sdk 的签名证书不符合既有轮换策略。" >&2
    exit 1
  fi
done
"$ZIPALIGN" -c -P 16 4 "$TEMP_APK"
mv "$TEMP_APK" "$OUTPUT"
echo "发布签名验证通过：Android 13+ 正式证书，Android 10–12L 原证书。"
