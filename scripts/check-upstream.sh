#!/usr/bin/env bash
# 上游健康检查：一条命令定位「本地代理/节点问题」还是「上游（Bangumi/Cloudflare）问题」。
#
# 用法：
#   bash scripts/check-upstream.sh
#
# 说明：
#   1) 直连检测会自动忽略 shell 里的 http_proxy/https_proxy 环境变量，反映
#      「macOS 系统网络」的真实状态（TUN 开启时 Clash 会透明接管，此时算代理链路）。
#   2) 显式代理检测走 127.0.0.1:7890（Clash 默认端口），TUN 关闭、仅系统代理时用它验证。
#   3) DNS 污染检测只看已知的污染特征 IP（网飞/Dropbox/Facebook 等）和 fake-ip 段。

set -u

WORKER="https://kaku-api.shqingda.workers.dev"
BANGUMI="https://api.bgm.tv"
PROXY="http://127.0.0.1:7890"
TIMEOUT=10

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

result() { printf "${1}%s${RESET}\n" "$2"; }

fetch() {
  # $1 = label, $2 = url, $3 = 额外 curl 参数（如 -x 代理）
  local label="$1" url="$2" extra="${3:-}"
  local out
  out=$(curl -sS $extra -o /dev/null -w "%{http_code} %{time_total}s" \
    --max-time "$TIMEOUT" "$url" 2>&1) || out="失败/超时"
  printf '%-28s %s\n' "$label" "$out"
}

is_polluted() {
  # $1 = resolved IP；命中污染特征 → 0
  case "$1" in
    # Clash fake-ip 段（TUN/fake-ip 模式下正常，不代表污染）
    198.18.*) return 1 ;;
    # 经典 GFW 污染特征 IP 段
    108.160.* | 179.60.* | 199.96.* | 50.23.* | 93.184.* | 203.98.* | 146.75.* | 2.19.*)
      return 0 ;;
    *) return 1 ;;
  esac
}

echo "==================== 链路检测 ===================="
echo "（直连 = 忽略 shell 代理变量的真实链路；显式代理 = 127.0.0.1:7890）"
echo ""
echo "== 1. 直连（TUN 开启时由 Clash 透明接管）=="
fetch "worker /public/rankings" "$WORKER/public/rankings?type=2"
fetch "Bangumi v0 subject" "$BANGUMI/v0/subjects/1"
fetch "基础网络 baidu" "https://www.baidu.com"

echo ""
echo "== 2. 显式代理 127.0.0.1:7890（测 Clash 节点链路）=="
fetch "worker (代理)" "$WORKER/public/rankings?type=2" "-x $PROXY"
fetch "Bangumi (代理)" "$BANGUMI/v0/subjects/1" "-x $PROXY"

echo ""
echo "== 3. DNS 污染检测 =="
for host in "$WORKER" "$BANGUMI" "bgm.tv" "next.bgm.tv"; do
  domain="${host#https://}"
  ip="$(dig +short "$domain" 2>/dev/null | head -1)"
  if [ -z "$ip" ]; then
    printf '%-36s 解析失败\n' "$domain"
  elif is_polluted "$ip"; then
    printf '%-36s %s （污染特征 IP）\n' "$domain" "$ip"
  else
    printf '%-36s %s\n' "$domain" "$ip"
  fi
done

echo ""
echo "==================== 结论指引 ===================="
echo "1. 直连全部成功 → 当前链路健康，App 应该正常。"
echo "2. 直连失败、显式代理成功 → 需要 Clash 系统代理（模拟器会跟随），或开 TUN。"
echo "3. 直连和显式代理都失败 → Clash 未运行或节点到 Cloudflare/Bangumi 不通，"
echo "   换个能连 Cloudflare 的节点再试；DNS 若显示污染特征，确认 Clash DNS 走 DoH。"
echo "4. 直连失败但 Baidu 成功 → 该网络对 Bangumi/Cloudflare 不友好（被墙/污染），"
echo "   Android 实机同样需要手机端代理或 DoH。"
