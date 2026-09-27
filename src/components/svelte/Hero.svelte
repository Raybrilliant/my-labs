<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap, prefersReducedMotion } from '../../utils/gsap';
  import HeroCanvas from './HeroCanvas.svelte';

  const HEADLINES: { text: string; outline?: boolean; asterisk?: boolean }[] = [
    { text: 'WE BUILD DIGITAL' },
    { text: "PRODUCTS THAT DON'T" },
    { text: 'LOOK LIKE', outline: true },
    { text: "EVERYONE ELSE'S", asterisk: true },
  ];

  let sectionEl: HTMLElement;

  // Neon power state: hover strikes the tube on, leaving lets it sputter
  // out (hl-neon-off) instead of snapping back to plain outline
  let neonLive = $state(false);
  let neonDying = $state(false);
  let loaderEl: HTMLDivElement;
  let loaderRedEl: HTMLDivElement;
  let loaderInnerEl: HTMLDivElement;
  let counterEl: HTMLSpanElement;
  let barEl: HTMLDivElement;

  /** Read by HeroCanvas' render loop each frame (see HeroCanvas.svelte). */
  const scrollFx = { progress: 0 };

  onMount(() => {
    const reduced = prefersReducedMotion();
    let visited = false;
    try {
      visited = sessionStorage.getItem('rl_visited') === '1';
    } catch {
      /* storage blocked — treat as first visit */
    }

    const ctx = gsap.context(() => {
      if (reduced) {
        // Reduced motion: fully static hero, CSS keeps everything visible.
        gsap.set('[data-hero-anim], .hero-canvas-wrap, .hl-char', { clearProps: 'all' });
        return;
      }

      // -- Initial states (CSS gates hide these from first paint) --
      // y:0 is critical: GSAP parses the CSS paint-gate's translateY(118%)
      // as a px offset on first touch and would otherwise KEEP it as `y`
      // forever — the reveal only tweens yPercent, so chars stayed ~117px
      // low (clipped) and only the overflow-visible neon line showed.
      gsap.set('.hl-char', { y: 0, yPercent: 118, rotate: 5 });
      gsap.set('[data-hero-anim]', { autoAlpha: 0, y: 24 });
      gsap.set('.hero-canvas-wrap', { autoAlpha: 0, scale: 0.92 });
      gsap.set('.hero-meta', { scaleX: 0, transformOrigin: 'left center' });

      /**
       * Staggered hero reveal. `fast` = repeat visitors: same choreography,
       * compressed timing, no loader in front of it.
       */
      const reveal = (fast: boolean): gsap.core.Timeline => {
        const D = fast ? 0.55 : 1;
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.to('.hero-canvas-wrap', { autoAlpha: 1, scale: 1, duration: 1.4 * D, ease: 'power3.out' }, 0)
          // Eyebrow: terminal-style left-to-right print
          .fromTo(
            '[data-hero-anim="eyebrow"]',
            { autoAlpha: 0, y: 24, clipPath: 'inset(0 100% 0 0)' },
            { autoAlpha: 1, y: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.6 * D, ease: 'power2.inOut' },
            0.05 * D
          )
          // Headline: lines converge — odd lines cascade from the left,
          // even lines from the right, so the block assembles inward
          // y:0 guarantees a clean landing even if the CSS gate applied late
          .to('.hl-line:nth-child(1) .hl-char', { y: 0, yPercent: 0, rotate: 0, duration: 0.9 * D, stagger: 0.018 * D }, 0.18 * D)
          .to('.hl-line:nth-child(2) .hl-char', { y: 0, yPercent: 0, rotate: 0, duration: 0.9 * D, stagger: { each: 0.018 * D, from: 'end' } }, 0.3 * D)
          .to('.hl-line:nth-child(3) .hl-char', { y: 0, yPercent: 0, rotate: 0, duration: 0.9 * D, stagger: 0.018 * D }, 0.42 * D)
          .to('.hl-line:nth-child(4) .hl-char', { y: 0, yPercent: 0, rotate: 0, duration: 0.9 * D, stagger: { each: 0.018 * D, from: 'end' } }, 0.54 * D)
          .to('[data-hero-anim="sub"]', { autoAlpha: 1, y: 0, duration: 0.7 * D }, 0.85 * D)
          .to('[data-hero-anim="cta"]', { autoAlpha: 1, y: 0, duration: 0.7 * D }, 1.0 * D)
          // Sticker: overshoot pop settling into its -2deg paste angle
          .fromTo(
            '[data-hero-anim="sticker"]',
            { autoAlpha: 0, y: 24, rotate: 8 },
            { autoAlpha: 1, y: 0, rotate: 0, duration: 0.55 * D, ease: 'back.out(2.2)' },
            1.1 * D
          )
          // The seam draws itself, then the meta labels drop in
          .to('.hero-meta', { scaleX: 1, duration: 0.65 * D, ease: 'power3.inOut' }, 1.15 * D)
          .to('[data-hero-anim="meta"]', { autoAlpha: 1, y: 0, duration: 0.5 * D, stagger: 0.08 * D }, 1.32 * D)
          .to('[data-hero-anim="scrollhint"]', { autoAlpha: 1, y: 0, duration: 0.5 * D }, 1.48 * D)
          // Release the reveal mask so the neon glow can bloom past the
          // line box once the chars have landed
          .set('.hl-line-neon', { overflow: 'visible' });
        return tl;
      };

      // Scroll-hint pulse loop (both entrances)
      gsap.to('[data-hero-anim="scrollhint"] .hint-arrow', {
        y: 5,
        repeat: -1,
        yoyo: true,
        duration: 0.55,
        ease: 'sine.inOut',
      });

      if (visited || prefersReducedMotion()) {
        // Repeat visitors + reduced-motion users: skip the loader entirely,
        // straight into the fast reveal (also keeps Lighthouse LCP honest)
        reveal(true);
        return;
      }

      // -- First visit: loader, panel sweep, red chase panel, reveal --
      const counter = { v: 0 };
      const intro = gsap.timeline();
      intro
        .to(counter, {
          v: 100,
          duration: 0.9,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (counterEl) counterEl.textContent = `${String(Math.round(counter.v)).padStart(3, '0')}%`;
            if (barEl) barEl.style.transform = `scaleX(${counter.v / 100})`;
          },
        })
        .to(loaderInnerEl, { autoAlpha: 0, y: -24, duration: 0.25, ease: 'power2.in' }, '+=0.05')
        // Double-panel wipe: concrete exits, signal-red chases it
        .to(loaderEl, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, '<0.1')
        .to(loaderRedEl, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, '<0.1')
        .set(loaderEl, { display: 'none' })
        .set(loaderRedEl, { display: 'none' })
        .add(reveal(false), '-=0.6');

      try {
        sessionStorage.setItem('rl_visited', '1');
      } catch {
        /* ignore */
      }
    }, sectionEl);

    // -- Cinematic exit: pin hero, copy flies up, 3D shrinks ---
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top top',
          end: '+=100%',
          scrub: true,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      // Canvas shrink happens in-scene via scrollFx (full-bleed canvas is
      // never transformed, so nothing gets clipped); copy stays readable
      // through the first half of the pin, then exits.
      tl.fromTo(
        scrollFx,
        { progress: 0 },
        { progress: 1, ease: 'none', duration: 1, immediateRender: false },
        0
      ).to('.hero-content', { yPercent: -16, autoAlpha: 0, ease: 'power1.in', duration: 0.5 }, 0.5);
    });

    return () => {
      mm.revert();
      ctx.revert();
    };
  });
</script>

<section
  bind:this={sectionEl}
  id="hero"
  class="relative flex min-h-svh flex-col overflow-hidden border-b-2 border-concrete-900 bg-concrete-50"
>
  <HeroCanvas scrollFx={scrollFx} />

  <!-- exposed structural seams -->
  <div class="bg-blueprint pointer-events-none absolute inset-0 z-[1]" aria-hidden="true"></div>

  <div
    class="hero-content shell relative z-10 flex flex-1 flex-col justify-center pt-16 pb-6 md:pt-16 md:pb-8"
  >
    <p
      data-hero-anim="eyebrow"
      class="mb-5 flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-concrete-900 uppercase md:text-xs"
    >
      <span class="animate-blink inline-block h-2 w-2 bg-signal" aria-hidden="true"></span>
      [ SOFTWARE DEVELOPMENT STUDIO ]
    </p>

    <h1
      class="font-display text-concrete-900 uppercase leading-[0.88] text-[clamp(2.75rem,7.8vw,8rem)]"
      class:neon-live={neonLive}
      class:neon-dying={neonDying}
      onmouseenter={() => {
        neonLive = true;
        neonDying = false;
      }}
      onmouseleave={() => {
        neonLive = false;
        neonDying = true;
      }}
    >
      {#each HEADLINES as line (line.text)}
        <span class="hl-line block overflow-hidden pb-[0.06em]" class:hl-line-neon={line.outline}>
          <span class:text-stroke-black={line.outline} class:hl-neon={line.outline}>
            {#each line.text.split('') as ch, i (i)}
              <span class="hl-char inline-block will-change-transform"
                >{ch === ' ' ? '\u00A0' : ch}</span
              >
            {/each}
            {#if line.asterisk}<span class="hl-char inline-block text-signal">*</span>{/if}
          </span>
        </span>
      {/each}
    </h1>

    <div
      data-hero-anim="sticker"
      class="shadow-hard mt-4 inline-block w-fit rotate-[-2deg] border-2 border-concrete-900 bg-signal px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.2em] text-concrete-50 uppercase md:ml-[34%]"
    >
      2025 SLOTS: 3 LEFT — NO CAP
    </div>

    <div class="mt-8 flex flex-col md:mt-8 md:flex-row md:items-end">
      <div class="md:ml-auto md:max-w-md">
        <p data-hero-anim="sub" class="text-base leading-relaxed text-concrete-600 md:text-lg">
          A software studio shipping sites, apps and MVPs with actual taste — fast where it
          counts, weird on purpose, reliable under pressure.
          <span class="font-medium text-signal">*That's the whole point.</span>
        </p>
        <div data-hero-anim="cta" class="mt-6 flex flex-wrap items-center gap-5">
          <a href="#contact" class="btn-brutal">[ START A PROJECT → ]</a>
          <a href="#projects" class="btn-ghost">SEE THE WORK ↓</a>
        </div>
      </div>
    </div>

    <div
      class="hero-meta mt-8 grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-concrete-900 pt-4 font-mono text-[11px] tracking-[0.2em] text-concrete-900 uppercase md:mt-8 md:grid-cols-3 md:text-xs"
    >
      <p data-hero-anim="meta">PROBOLINGGO, ID — REMOTE WW</p>
      <p data-hero-anim="meta" class="text-right md:text-center">WEB / MOBILE / MVP</p>
      <p
        data-hero-anim="scrollhint"
        class="col-span-2 flex items-center justify-start gap-2 md:col-span-1 md:justify-end"
      >
        SCROLL <span class="hint-arrow inline-block text-signal">↓</span>
      </p>
    </div>
  </div>

  <!-- Pre-loader: 000% -> 100% (fast reveal instead for repeat visitors) -->
  <div
    bind:this={loaderEl}
    class="hero-loader fixed inset-0 z-[90] flex flex-col justify-between bg-concrete-50 px-5 py-6 md:px-12"
    aria-hidden="true"
  >
    <div bind:this={loaderInnerEl} class="flex flex-1 flex-col justify-between">
      <p class="font-mono text-[11px] tracking-[0.3em] text-concrete-600 uppercase">
        RAYBRILLIANT<span class="text-signal">®</span>LABS — INITIALIZING<span
          class="animate-blink">_</span
        >
      </p>
      <p
        class="font-display text-concrete-900 leading-none text-[clamp(4rem,16vw,11rem)]"
      >
        <span bind:this={counterEl}>000%</span>
      </p>
    </div>
    <div class="mt-6 h-[3px] w-full bg-concrete-300">
      <div bind:this={barEl} class="h-full w-full origin-left scale-x-0 bg-signal"></div>
    </div>
  </div>

  <!-- Chase panel: revealed the moment the loader sweeps, then follows it -->
  <div
    bind:this={loaderRedEl}
    class="hero-loader-red fixed inset-0 z-[89] bg-signal"
    aria-hidden="true"
  ></div>
</section>
