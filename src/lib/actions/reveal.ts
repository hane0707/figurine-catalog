// ビューポート進入時に .in を付与するスクロールリビール用アクション
export function reveal(node: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    node.classList.add('in');
    return {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        node.classList.add('in');
        io.disconnect();
      }
    },
    { rootMargin: '0px 0px -40px 0px' },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}
