# フォローアップ一覧

未着手の既知課題を集約する。着手したら該当行を削除し、必要なら plans/ に計画を起こす。

## feature/ui-refinement 由来（2026-07-04 レビュー承認済みブランチのマージ後に推奨）

- [ ] **og:image が R2 presigned URL のため期限切れで 404 になる** — 恒久 URL 化（公開プロキシ等）が必要。OGP を告知する前に対応すること
- [ ] URL フィルタパラメータ（`?kind` / `?sort`）のホワイトリスト検証を追加する
- [ ] GlitchText の sessionStorage アクセスに try/catch を付ける（プライベートブラウジング等で例外の恐れ）
- [ ] `src/app.css` のグローバル `:focus-visible` が `border-radius: 4px` を設定している — 将来の角丸要素でフォーカスリングの角が四角く見える恐れ
- [ ] スケルトンがリスト表示時もグリッド形状のまま

## 技術的負債

- [ ] `npm run check`（svelte-check）の既存 75 エラー / 28 警告を段階的に解消する（基準値は CLAUDE.md 参照。解消したらベースラインを更新すること）
