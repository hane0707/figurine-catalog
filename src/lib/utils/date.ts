/** ISO 8601 日時/日付文字列を「YYYY.MM.DD」に整形する。null系は空文字、不正形式はそのまま返す。 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[1]}.${m[2]}.${m[3]}`;
}
