<svelte:head>
  <title>Privacy Policy — Haku's suitcase</title>
</svelte:head>

<div class="ambient" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
</div>

<div class="privacy-page">
  <nav class="nav" style="margin-bottom: 0">
    <a href="/items" class="btn --ghost" style="gap:6px; padding:8px 14px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span style="font-family:var(--f-mono); font-size:11px; letter-spacing:0.1em">COLLECTION</span>
    </a>
  </nav>

  <div class="privacy-content">
    <div class="eyebrow" style="margin-bottom: 16px">Legal</div>
    <h1 class="display" style="font-size: clamp(28px, 4vw, 52px); margin-bottom: 40px; line-height: 1.1">
      Privacy Policy
    </h1>

    <div class="privacy-body">
      <section>
        <h2>アクセス解析ツールについて</h2>
        <p>
          当サイトでは、利用状況の分析にGoogle社が提供するGoogleアナリティクスを使用しています。Googleアナリティクスではトラフィックデータの収集のためにクッキー（Cookie）を使用しております。トラフィックデータは匿名で収集されており、個人を特定するものではありません。
        </p>
        <p>Googleアナリティクスによるデータ収集の仕組みや利用規約については以下をご覧ください。</p>
        <ul>
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Googleポリシーと規約</a></li>
          <li><a href="https://marketingplatform.google.com/about/analytics/terms/jp/" target="_blank" rel="noopener">Googleアナリティクス利用規約</a></li>
        </ul>
      </section>

      <section>
        <h2>免責事項</h2>
        <p>
          当サイトは二次創作ファンサイト、および個人の創作・コレクション記録サイトであり、掲載されている二次創作作品に関わる原作・版権元とは一切関係ありません。当サイトで提供される情報を用いたことによっていかなる損失・損害が発生しても、一切の責任を負いません。
        </p>
        <p>
          当サイトからリンクなどによって他のサイトに移動された場合、移動先サイトで提供される情報、サービス等について一切の責任を負いません。
        </p>
      </section>

      <section>
        <h2>著作権について</h2>
        <p>
          当サイトに掲載した文章・画像等の著作物を無断転載することを禁止します。<br />
          リバース:1999からの引用部、および各作品からのインスパイアによる二次創作物に関わる著作権は原作・版権元に帰属します。
        </p>
        <p>
          一次創作品（オリジナル造形作品等）の著作権は制作者 [haku] に帰属します。
        </p>
      </section>

      <section>
        <h2>リンクポリシー</h2>
        <p>当サイトはリンクフリーです。</p>
      </section>

      <section>
        <h2>お問い合わせについて</h2>
        <p>
          現在当サイトではお問い合わせフォームを設けておりません。<br />
          お問い合わせの際は以下のメールアドレスへご連絡ください。
        </p>
        <p><a href="mailto:haku.craft1205@gmail.com">haku.craft1205@gmail.com</a></p>
      </section>
    </div>
  </div>

  <footer class="page-footer">
    <a href="/about">About</a>
    <span>·</span>
    <a href="/items">← Collection へ戻る</a>
  </footer>
</div>

<style>
  .privacy-page {
    position: relative; z-index: 1;
    max-width: 720px; margin: 0 auto;
    padding: 32px 40px 120px;
  }
  @media (max-width: 720px) {
    .privacy-page { padding: 20px 16px 100px; }
  }
  .privacy-content { margin-top: 48px; }
  .privacy-body {
    display: flex; flex-direction: column; gap: 40px;
    font-size: 14px; line-height: 1.8; color: var(--fg-mute);
  }
  .privacy-body section { display: flex; flex-direction: column; gap: 12px; }
  .privacy-body h2 {
    font-family: var(--f-display); font-size: 18px; font-weight: 400;
    letter-spacing: -0.01em; color: var(--fg); margin: 0;
  }
  .privacy-body p { margin: 0; }
  .privacy-body ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
  .privacy-body a { color: var(--fg); }
  .privacy-body a:hover { opacity: 0.7; }
  .page-footer {
    margin-top: 64px;
    display: flex; gap: 16px; align-items: center;
    font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--fg-soft);
  }
  .page-footer a { color: inherit; text-decoration: none; }
  .page-footer a:hover { color: var(--fg); }
</style>
