# Final Whole-Branch Review — feature/ui-refinement (d7d124c..527e643)

Reviewer lens: cross-task interactions, cumulative drift, branch-as-a-whole. Task-scoped reviews already passed; `npm run check` baseline unchanged, 102/102 tests pass, build succeeds.

## Strengths

- **prefers-reduced-motion coverage is genuinely complete.** Every new motion source is guarded, and each at the right layer: tilt (`canHover` gate in items/+page.svelte), reveal (JS guard in reveal.ts *and* CSS fallback in app.css:1567-ish), parallax (`reducedMotion` state in +layout.svelte), skeleton pulse (app.css `@media` block), view transitions (JS guard in `onNavigate` *and* CSS `::view-transition-*` kill switch), GlitchText (reduced check runs *before* the sessionStorage fast-path branch, so ordering is correct). This is the hardest thing to keep coherent across 16 subagent tasks and it held.
- **SSR safety holds everywhere.** All `matchMedia`/`sessionStorage`/`document` access is inside `onMount`, `$effect`, actions, or event handlers. `reveal` is an action (client-only by construction). `scrollY` starts at 0 and `reducedMotion` at false, so SSR output is deterministic.
- **No style-attribute collisions.** Each element that gained inline styles has exactly one template-literal source: `amb-ring` combines `animation-duration` + `translate` in one attribute; spotlight img, card-img `view-transition-name`, skel-card delay are all single-source. The parallax deliberately uses the `translate` property so it composes with the `transform: rotate()` keyframe animation on the rings instead of clobbering it — nice.
- **Token coherence after the amber recolor is solid.** The shadcn bridge (`--background: var(--bg)` etc.) removes the dual-token drift risk; `--error` → `--danger` fixed; dark mode gained a `--danger` override; GlitchText MASK_COLORS were recolored to the amber family (the single remaining 285-hue entry reads as deliberate accent variety, matching `--accent-haze`'s role).
- **Lightbox interaction model is correct.** Backdrop-click uses `e.target === dialogEl` with `.lb-stage` at `pointer-events: none` (the d3a29ae fix), Esc flows through native `close` → `onclose` → `open = false`, and the `$effect` open/close sync is idempotent. The two `svelte:window` keydown handlers (Lightbox vs prev/next nav) are mutually exclusive by guard (`if (!open) return` vs `if (editing || lightboxOpen) return`) — no double-handling.
- **Stacking contexts work out.** Grain (z 9999, pointer-events none) intentionally textures nav(100)/hex-panel(200)/FAB(20); the `<dialog>` top layer renders above it so the lightbox stays clean; ambient/ink stay at 0 under content. Nothing is unusable.
- **IntersectionObserver hygiene**: `reveal` disconnects both after firing and in `destroy`; the items-page sentinel observer is cleaned up in the onMount return. No leaks found.
- Filter URL sync uses `replaceState` (no history spam), restores all four params on load, and the initial `fetchItems()` in onMount runs *after* state init so deep links actually filter. `sort` is included in the fetch params (verified at items/+page.svelte:58-66).
- Inter Variable actually resolves (`@fontsource-variable/inter` was already a dependency, imported at app.css:4) — the font fix is real, not a name-only change.

## Issues

### Critical (Must Fix)

None found.

### Important (Should Fix)

1. **src/routes/items/[id]/+page.svelte:259-265 (`onNavKeydown`) — no modifier or key-repeat guard.**
   - *What*: `if (e.key === 'ArrowLeft' && data.prevId) goto(...)` fires on any ArrowLeft keydown, including `Alt+ArrowLeft` (browser Back on Windows/Linux/WSL users — i.e. this user) and auto-repeat while a key is held.
   - *Why*: Alt+Left triggers **both** history back and `goto(prevId)` → user lands somewhere unintended. Held arrow key fires a `goto` per repeat event; each is a full server load (D1 item query + 2 prev/next queries + R2 presigning of every photo) plus a `startViewTransition` that aborts the in-flight one — server-load storm and visual stutter, a direct Task 9 × Task 13 interaction.
   - *Fix*: first line of the handler: `if (e.altKey || e.metaKey || e.ctrlKey || e.repeat) return;` (consider `e.repeat` in Lightbox nav too, though it's cheap there).

2. **src/routes/items/[id]/+page.svelte:344-350 — thumb backdrop never removed behind `object-fit: contain` image.**
   - *What*: `.detail-img-btn img` renders the original at `contain`, but the inline `background-image: url(thumb); background-size: cover` stays forever. Lightbox solves this (`.--loaded { background-image: none !important }`); the detail panel doesn't.
   - *Why*: for any photo whose aspect ratio differs from the panel's, the letterbox bars permanently show a cover-cropped copy of the same photo behind the contained one — reads as a doubled/glitched image, on the flagship photo surface of the branch.
   - *Fix*: either change the placeholder to `background-size: contain; background-repeat: no-repeat; background-position: center` (aligns exactly with where the orig will paint), or copy the Lightbox `onload` → clear-background pattern. The spotlight (items/+page.svelte:~230) uses cover-on-cover so it's safe as-is, but applying the same onload cleanup there costs nothing.

3. **og:image presigned R2 URLs (src/routes/items/+page.svelte:~152, src/routes/items/[id]/+page.svelte:~275) — known/documented, but restating for the merge record.**
   - Presigned URLs expire; scrapers (Twitter/Discord/Slack) cache the tag at crawl time and the image 404s after TTL. OGP will appear to "work then break". No security issue beyond what's documented (thumb URLs are already exposed to any viewer). Ship-able as accepted debt, but the feature won't reliably deliver its value until images are served from a stable public route (e.g. `/api/og/[id]` proxying R2, or a public bucket domain for thumbs). Recommend a follow-up ticket before announcing OGP support.

### Minor (Nice to Have)

4. **src/routes/items/+page.svelte:33-36 — URL filter params unvalidated.** `?kind=banana&sort=evil` is accepted into state: no seg button shows active, and the values are forwarded verbatim to `/api/items`. The API was always URL-controllable directly so there's no new attack surface, but whitelisting against `kindOptions`/`sortOptions` keys would keep UI state honest.
5. **src/lib/components/GlitchText.svelte:99-108 — `sessionStorage` unguarded.** In storage-blocked contexts (some privacy modes/embeds) `sessionStorage.getItem` throws inside `onMount`, which can blow up hero mount. Wrap in try/catch. Also note the `glitch-seen` key is shared between the hero and the error page (+error.svelte uses GlitchText), so seeing an error page fast-paths the hero on first real visit — arguably fine, but worth knowing it's one flag.
6. **Detail→list image morph never fires.** The list page fetches items client-side in onMount, so at view-transition snapshot time the new page has no `item-img-*` elements; the morph gracefully degrades to a root cross-fade. List→detail works. Not a bug (fallback is clean), but the Task 9 feature is effectively one-directional; documenting this saves a future "why doesn't it morph back" investigation.
7. **src/routes/items/+page.svelte:434-443 — skeleton shown for every append and only in grid shape.** The `skel-grid` (columnCount×2 cards) renders below existing items on every infinite-scroll page, a large layout pulse where the old text loader was 1 line; and it renders the same grid shape when `layout === "list"`. Consider a compact row skeleton for list layout and fewer cards on append (`items.length > 0 ? columnCount : columnCount * 2`).
8. **src/routes/+layout.svelte:80-96 — five repeated parallax inline expressions** (`reducedMotion ? 0 : scrollY * k`). A tiny `para(k)` helper or `$derived` factors would remove the repetition (accumulated minor #6).
9. **Hardcoded values vs the "always var()" constraint**: theme-color hexes `#e4e1e9`/`#2a292e` in +layout.svelte (unavoidable — meta content can't use `var()`, but they now silently duplicate `--bg` and must be kept in sync by hand; a comment pointing at the tokens would help) and Lightbox's raw `oklch(...)` chrome (deliberate: fixed dark chrome valid in both modes). Both acceptable, both worth a comment.
10. **app.css:121-125 — global `:focus-visible { border-radius: 4px }` mutates the focused element's own radius.** The exception list (.btn/.chip/.seg/.fab/.toggle-chip/.card) patches the app.css-styled cases and Svelte-scoped component styles out-specificity it, but any future globally-styled rounded element will get visibly squared corners on keyboard focus. `outline` follows border-radius natively in modern browsers; the rule could set only outline and let radius come from the element.

## Minor-findings triage (the 7 accumulated task-review minors)

1. **GlitchText unmount cleanup (timers run after destroy)** — ship as-is: pre-existing pattern, timers touch detached nodes harmlessly; fold into #5's try/catch pass later.
2. **formatDate regex not end-anchored** — ship as-is: the non-anchored end is what allows `T…`/`  …` suffixes; "2026-04-211234" cannot occur from D1's ISO output, and the fallback behavior is sensible.
3. **.detail-img-btn img duplicating .detail-img-panel img (app.css:957)** — ship as-is: not actually dead (still matches as descendant, harmless identical declarations), but fold cleanup into the Important #2 fix since it touches the same lines.
4. **Lightbox aria-label/alt double announcement** — ship as-is: `alt=""` on lb-img means it isn't announced; the dialog aria-label + button labels are correct as written.
5. **prev/next non-unique on identical createdAt** — ship as-is: pre-existing schema limitation, single-owner data, worst case is a skipped neighbor; needs a `(createdAt, id)` tiebreak if ever fixed.
6. **5 repeated parallax expressions** — ship as-is (see Minor #8); pure readability.
7. **list-view morph inclusion / error copy shared across non-404 statuses** — ship as-is: list-view `view-transition-name` is mutually exclusive with grid via `{#if}` (no duplicate-name risk), and one poetic copy for all 5xx-class errors fits the site's voice.

## Recommendations

1. Before merge: apply the two one-file fixes — modifier/repeat guard in `onNavKeydown` (Important #1) and the thumb-backdrop cleanup on the detail image (Important #2). Both are <10-line changes with no test impact.
2. File a follow-up for stable OGP image URLs (Important #3) before sharing links anywhere that caches cards.
3. Batch the remaining minors (#4, #5, #8, #10 + try/catch around sessionStorage) into one small polish commit post-merge rather than blocking on them.
4. When the next design task touches app.css, revisit the global focus-visible radius rule (#10) — it's the one piece of this branch most likely to bite a future component silently.

## Assessment

**Ready to merge?** Yes

**Reasoning:** Both Important findings were fixed in commit 80294f5 and verified by diff review: `onNavKeydown` now opens with `if (e.altKey || e.metaKey || e.ctrlKey || e.repeat) return;`, Lightbox gained the modifier guard (key-repeat intentionally allowed there for photo cycling — correct call), and the detail placeholder switched to `background-size: contain; background-repeat: no-repeat; background-position: center`, aligning the thumb exactly with where the contained original paints. check 75/28 baseline unchanged, tests 102/102. Remaining items are Minor/accepted-debt (OGP presigned-URL stability recommended as a post-merge follow-up) and do not block.

*(Updated 2026-07-03 after verifying fix commit 80294f5. Original verdict: "With fixes" — Important #1 and #2 resolved.)*
