# 新規登録ウィザード：サマリーカード設計

**日付:** 2026-04-20  
**対象ファイル:** `src/routes/items/new/+page.svelte`, `src/lib/components/SummaryCard.svelte`（新規）

---

## 背景・課題

新規登録ウィザードは5ステップ（photo → basic → type → details → tags）で構成されている。  
各ステップの上部にチップ形式のサマリー行があるが、`details` ステップで入力した購入情報・制作情報はどのステップでも表示されていない。  
最後の `tags` ステップで全入力内容を確認できないため、登録ミスに気づきにくい。

---

## 設計方針

`tags` ステップに遷移したとき、タグ入力欄の**上に「入力内容の確認」カードを表示**する。  
カードは読み取り専用ではなく、各セクションに「← 編集」ボタンを設けて対応ステップに戻れるようにする。

---

## サマリーカードの構成

### セクション一覧

| セクション | 表示内容 | 編集ボタンの遷移先 |
|---|---|---|
| 📷 写真 | サムネイル（最大4枚表示）+ 枚数。0枚の場合は「未登録」 | `step = 'photo'` |
| 📝 基本情報 | 名前、シリーズ名。未入力は `—` | `step = 'basic'` |
| 🛒 購入情報 または 🎨 制作情報 | 下記参照 | `step = 'details'` |

### 購入情報（isHandmade === 0）の表示項目

- 店舗名 / ECサイト名
- イベント名
- 購入日
- 金額（¥付き）
- メーカー名
- 作家名 / 原型師名

### 制作情報（isHandmade === 1）の表示項目

- 制作開始日
- 制作終了日
- 使用素材（バッジ形式）
- 制作メモ

### 空欄・未入力の扱い

- テキストフィールドが空の場合: `—` を表示（`text-muted-foreground`）
- 写真が0枚: 「未登録」と表示
- `isHandmade` が null（typeをスキップした）場合: 購入情報・制作情報セクションを非表示

---

## コンポーネント設計

### 新規コンポーネント: `SummaryCard.svelte`

`+page.svelte` が400行超のため、カードは独立コンポーネントとして切り出す。

**Props:**

```typescript
interface Props {
  uploadedPhotos: { id: string; r2KeyThumb: string; thumbViewUrl: string }[];
  name: string;
  series: string;
  isHandmade: number | null;
  // 購入情報
  storeName: string;
  eventName: string;
  purchaseDate: string;
  purchasePrice: string;
  maker: string;
  artistName: string;
  // 制作情報
  productionStart: string;
  productionEnd: string;
  selectedMaterials: { id: string; name: string }[];
  notes: string;
  // コールバック
  onEdit: (step: string) => void;
}
```

**コールバック:**  
`onEdit(step)` を呼ぶと親の `step` 変数が更新されてウィザードが対応ステップに遷移する。

---

## tagsステップのレイアウト

```
[SummaryCard]         ← タグ入力欄の上
[TagPicker]           ← 既存のタグ入力
[← 戻る] [完了 ✓]    ← 既存のボタン
```

---

## スタイル方針

- カード全体: `border rounded-xl p-4 mb-4 bg-background`
- セクション間: `border-t pt-3 mt-3` で区切り線
- セクションヘッダー: `flex justify-between items-center` で左にラベル、右に編集ボタン
- 編集ボタン: `text-xs text-muted-foreground hover:text-primary`
- 空欄値: `text-muted-foreground`
- 写真サムネイル: `grid grid-cols-4 gap-1`（最大4枚表示、それ以上は `+N枚` バッジ）

---

## 既存コードへの影響

- `+page.svelte` の `{:else if step === 'tags'}` ブロックに `<SummaryCard>` を追加するのみ
- 既存の上部チップ行（`stepIndex > 0` の部分）はそのまま残す
- 既存の TagPicker・ボタン類には変更なし

---

## 対象外（スコープ外）

- tags以外のステップでのサマリー表示変更
- 既存の上部チップ行のリデザイン
- タグ選択済み内容のサマリーカードへの追加（タグはその場で見える）
