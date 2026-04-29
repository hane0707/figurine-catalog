<script lang="ts">
  import GlitchText from "$lib/components/GlitchText.svelte";
</script>

<svelte:head>
  <title>About — Haku's suitcase</title>
</svelte:head>

<div class="ambient" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="amb-ring r1"></div>
  <div class="amb-ring r2"></div>
</div>

<div class="about-page">
  <div class="about-content">
    <div class="eyebrow" style="margin-bottom: 16px">About</div>
    <h1
      class="display"
      style="font-size: clamp(32px, 5vw, 64px); margin-bottom: 32px; line-height: 1.1"
    >
      <GlitchText
        segments={[
          { text: "H", stain: true },
          { text: "aku's" },
          { text: " s", stain: true },
          { text: "uitcase" },
        ]}
      />
    </h1>

    <div class="about-body">
      <p>作ったものと、出会ったもの。</p>
      <p>
        リバース:1999に登場する芸術品の二次創作品をはじめ、各地で出会ったお気に入りのフィギュアや購入品まで——私
        [haku] が手にしたものたちを、このスーツケースにまとめています。
      </p>
      <p>
        ここにいる間は、<ruby
          >神秘学家<rp>(</rp><rt>アルカニスト</rt><rp>)</rp></ruby
        >界でも稀有な才能を持つタイムキーパーのスーツケースと同様、雨を気にせずにお過ごしいただけます。
        どうぞお好きな場所でくつろぎながらご鑑賞ください。
      </p>
      <hr />
      <p>
        ※<ruby>神秘学家<rp>(</rp><rt>アルカニスト</rt><rp>)</rp></ruby
        >・人間の方関係なくお楽しみいただけます。
      </p>
      <p>
        ※なお、リバース:1999およびそれ以外の原作の存在する作品に関連する二次創作作品については、当サイトは非公式のファンサイトであり、
        原作・版権元とは一切関係ありません。
      </p>
    </div>
  </div>
</div>

<style>
  .about-page {
    position: relative;
    z-index: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 40px 120px;
  }
  @media (max-width: 720px) {
    .about-page {
      padding: 20px 16px 100px;
    }
  }
  .about-content {
    margin-top: 48px;
  }
  .about-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 15px;
    line-height: 1.8;
    color: var(--fg-mute);
  }
  .about-body p {
    margin: 0;
  }
  .about-body hr {
    border: none;
    border-top: 1px dashed var(--line);
    margin: 8px 0;
  }
</style>
