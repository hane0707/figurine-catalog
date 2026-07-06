#!/usr/bin/env bash
# リポジトリ清掃（Claude Code の SessionStart hook から毎セッション実行される）
# - Windows/WSL 由来の Zone.Identifier ゴミファイルを削除
# - コミット禁止の作業ディレクトリ（.omc / .superpowers）の再出現を警告
set -u
cd "$(dirname "$0")/.." || exit 0

# find の -delete は -depth を暗黙有効化して -prune と両立しないため rm で削除する
removed=0
while IFS= read -r f; do
  rm -f "$f" && removed=$((removed + 1))
done < <(find . \( -name node_modules -o -name .git -o -name .svelte-kit -o -name .wrangler \) -prune \
  -o -type f -name '*:Zone.Identifier' -print 2>/dev/null)

warn=""
for d in .omc .superpowers; do
  [ -e "$d" ] && warn="$warn $d"
done

msg=""
[ "$removed" -gt 0 ] && msg="Zone.Identifier を ${removed} 件削除しました。"
[ -n "$warn" ] && msg="${msg}gitignore 対象の${warn} が再出現しています（セッション成果物の置き場になっていないか確認してください）。"

if [ -n "$msg" ]; then
  printf '{"systemMessage": "repo-tidy: %s"}\n' "$msg"
fi
exit 0
