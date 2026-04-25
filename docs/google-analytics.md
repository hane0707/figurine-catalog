# Google Analytics 4 導入手順

このドキュメントでは、figurine-catalog（SvelteKit + Cloudflare Pages/Workers）に GA4 を導入する手順を説明します。

---

## 1. GA4 プロパティの作成

1. [Google Analytics](https://analytics.google.com/) にアクセスし、計測したい Google アカウントでログイン
2. 左下の「管理（歯車アイコン）」をクリック
3. 「アカウントを作成」またはプロパティ列の「プロパティを作成」をクリック
4. プロパティ名（例: `Haku's suitcase`）、タイムゾーン（日本）、通貨（JPY）を設定して「次へ」
5. ビジネスの詳細（業種: その他、規模: 小規模）を入力して「次へ」
6. ビジネス目標は「サイトへのトラフィックを調べる」を選択して「作成」
7. データストリームの設定: 「ウェブ」を選択
8. URL（例: `https://figurine-catalog.pages.dev`）とストリーム名を入力して「ストリームを作成」

---

## 2. 測定 ID の取得

1. データストリーム詳細画面の右上に「測定 ID」が表示される（形式: `G-XXXXXXXXXX`）
2. この ID をコピーして控えておく

---

## 3. `+layout.svelte` へのスニペット埋め込み

`src/routes/+layout.svelte` の `<svelte:head>` ブロックに以下を追加する。  
`G-XXXXXXXXXX` は実際の測定 ID に置き換えること。

```svelte
<svelte:head>
  <!-- 既存のタグは省略 -->

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</svelte:head>
```

### SvelteKit での注意点

`<svelte:head>` 内の `<script>` は SvelteKit によってサーバーサイドレンダリング時にも出力されるが、`gtag` はブラウザでのみ実行されるため問題ない。

ページ遷移ごとのビュー計測（SPA ナビゲーション）は GA4 のデフォルト設定では履歴 API の変化を自動検出する。`enhanced measurement` が有効になっている場合は追加の実装不要。

---

## 4. Cloudflare Pages / Workers での注意点

### CSP（Content Security Policy）

Cloudflare Pages でカスタム CSP ヘッダーを設定している場合、`www.googletagmanager.com` と `www.google-analytics.com` をホワイトリストに追加する必要がある。

`_headers` ファイルに記述する例:

```
/*
  Content-Security-Policy: script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com
```

このプロジェクトでは現在 CSP を設定していないため、追加作業は不要。

### SvelteKit のルーティングとの干渉

`__SvelteKit_base` を使ったルーティングと GA4 の自動イベント計測は干渉しない。Cloudflare Pages の `_routes.json` で静的ファイルを除外してあれば、Worker 側へのリクエストにも影響なし。

### Cookie と Cloudflare

GA4 が設定するファーストパーティ Cookie（`_ga`、`_ga_XXXXXXXXXX`）は Cloudflare のキャッシュに影響しない。Cloudflare のデフォルト設定では Cookie ヘッダーがあるレスポンスはキャッシュしないため、Worker の動的レスポンスも問題なし。

---

## 5. 動作確認

### リアルタイムレポートで確認

1. GA4 管理画面の左メニュー「レポート」→「リアルタイム」を開く
2. ブラウザで対象サイトにアクセス
3. 数秒以内に「過去 30 分間のユーザー数」が `1` に増えれば計測成功

### ブラウザの DevTools で確認

Network タブで `collect` または `gtag` をフィルターし、`https://www.google-analytics.com/g/collect` へのリクエストが発生していれば正常に動作している。

### GA4 デバッグビュー

Chrome 拡張「[Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)」を使うと、ページビューやイベントの詳細をリアルタイムで確認できる。

---

## 参考リンク

- [Google Analytics ヘルプ — ウェブサイトのタグ設定](https://support.google.com/analytics/answer/9304153)
- [SvelteKit でのアナリティクス実装例 (SvelteKit docs)](https://kit.svelte.dev/docs/seo#manual-setup-analytics)
- [Googleアナリティクス利用規約](https://marketingplatform.google.com/about/analytics/terms/jp/)
