<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap, prefersReducedMotion } from '../../utils/gsap';
  import type { Service } from '../../data/services';

  let { services }: { services: Service[] } = $props();

  let open = $state(-1);
  let listEl: HTMLElement;

  function isFinePointer() {
    return window.matchMedia('(pointer: fine)').matches;
  }

  function onEnter(i: number) {
    if (isFinePointer()) open = i;
  }

  function onLeave() {
    if (isFinePointer()) open = -1;
  }

  function onClick(i: number) {
    // On touch devices hover never fires, so tap toggles.
    open = isFinePointer() ? i : open === i ? -1 : i;
  }

  onMount(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-svc-row]',
        { autoAlpha: 0, y: 48 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: listEl, start: 'top 82%' },
        }
      );
    }, listEl);
    return () => ctx.revert();
  });
</script>

<section id="services" class="section-pad border-b-2 border-concrete-900 bg-concrete-50">
  <div class="shell">
    <header class="mb-14 md:mb-20">
      <p
        class="font-mono text-xs tracking-[0.3em] text-concrete-600 uppercase"
        data-reveal
      >
        [ 02 / SERVICES ]
      </p>
      <div class="mt-5 flex flex-wrap items-end justify-between gap-6">
        <h2
          class="font-display text-concrete-900 uppercase leading-[0.92] text-[clamp(2.6rem,7.5vw,6.5rem)]"
        >
          <span class="block overflow-hidden"
            ><span data-reveal="clip" class="block">WHAT WE</span></span
          >
          <span class="block overflow-hidden"
            ><span data-reveal="clip" data-reveal-delay="0.08" class="block"
              ><span class="text-stroke-black">ACTUALLY</span>
              <span class="text-signal">DO</span></span
            ></span
          >
        </h2>
        <p
          class="mb-2 max-w-xs font-mono text-xs leading-relaxed text-concrete-600"
          data-reveal
        >
          FIVE DISCIPLINES, ONE STANDARD: IF IT SHIPS, IT SHIPS PROPERLY. HOVER / TAP TO
          EXPAND.
        </p>
      </div>
    </header>

    <ul bind:this={listEl} class="border-t-2 border-concrete-900">
      {#each services as svc, i (svc.title)}
        <li
          data-svc-row
          class="svc-row border-b-2 border-concrete-900"
          data-open={open === i}
          onpointerenter={() => onEnter(i)}
          onpointerleave={onLeave}
        >
          <button
            type="button"
            class="group grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-4 py-6 text-left md:gap-8 md:py-8"
            aria-expanded={open === i}
            onclick={() => onClick(i)}
          >
            <span
              class="font-mono text-sm text-concrete-600 transition-colors duration-150 group-hover:text-signal"
            >
              0{i + 1}
            </span>
            <span
              class="font-display text-concrete-900 uppercase leading-none text-[clamp(1.8rem,5.5vw,4.25rem)] transition-all duration-200 group-hover:translate-x-3 {open ===
              i
                ? 'text-signal'
                : ''}"
            >
              {svc.title}
            </span>
            <span
              class="font-mono text-2xl leading-none transition-transform duration-300 md:text-3xl {open ===
              i
                ? 'rotate-45 text-signal'
                : 'text-concrete-900'}"
            >
              +
            </span>
          </button>
          <div class="svc-body">
            <div>
              <div class="grid gap-4 pb-8 md:grid-cols-[1fr_auto] md:pl-16">
                <p class="max-w-xl leading-relaxed text-concrete-600">{svc.desc}</p>
                <p class="font-mono text-xs tracking-widest text-signal self-end">
                  [{svc.tags.join(' / ')}]
                </p>
              </div>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</section>
