<svelte:head>
  <title>Dev Login</title>
</svelte:head>

<div style="min-height: 100dvh; display: grid; place-items: center; background: var(--bg, #f0edf8);">
  <div style="text-align: center; font-family: var(--f-mono, monospace);">
    <div style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--fg-soft, #888); margin-bottom: 24px;">
      DEV MODE
    </div>
    <form method="POST" action="?/login">
      <button
        type="submit"
        style="padding: 12px 32px; font-family: inherit; font-size: 12px; letter-spacing: 0.08em; cursor: pointer; border: 1px solid currentColor; background: transparent; color: var(--fg, #1a1a1a);"
      >
        ログインする
      </button>
    </form>
    <a
      href="/items"
      style="display: block; margin-top: 16px; font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft, #888); text-decoration: none;"
    >
      ← 一覧へ戻る
    </a>
  </div>
</div>
