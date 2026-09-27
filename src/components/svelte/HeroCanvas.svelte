<script lang="ts">
  import { onMount } from 'svelte';

  let wrapEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;

  /**
   * Shared scroll-exit channel. Hero.svelte's pinned GSAP timeline tweens
   * `progress` 0→1; the render loop maps it to in-scene shrink/drift so the
   * canvas itself stays full-bleed (scaling the canvas element would expose
   * its edges and clip the blob against the section). Plain object on
   * purpose — read every frame, no reactivity needed.
   */
  let { scrollFx = null }: { scrollFx?: { progress: number } | null } = $props();

  onMount(() => {
    let disposed = false;
    let teardown = () => {};

    // Start downloading the (tree-shaken) scene chunk immediately — it rides
    // the network in parallel with the intro loader instead of waiting for
    // idle. Scene construction still waits for load + idle below, so
    // hydration and INP stay unblocked.
    const sceneModule = import('../../utils/hero-scene');

    (async () => {
      // Keep the main thread free until the page has fully loaded and gone
      // idle — the canvas is behind the intro loader anyway.
      if (document.readyState !== 'complete') {
        await new Promise<void>((resolve) =>
          window.addEventListener('load', () => resolve(), { once: true })
        );
      }
      await new Promise<void>((resolve) => {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => resolve(), { timeout: 2000 });
        } else {
          window.setTimeout(resolve, 300);
        }
      });

      const { initHeroScene } = await sceneModule;
      if (disposed || !wrapEl || !canvasEl) return;
      teardown = initHeroScene({ wrapEl, canvasEl, scrollFx });
    })();

    return () => {
      disposed = true;
      teardown();
    };
  });
</script>

<div
  bind:this={wrapEl}
  class="hero-canvas-wrap pointer-events-none absolute inset-0 z-0"
  aria-hidden="true"
>
  <canvas bind:this={canvasEl} class="h-full w-full"></canvas>
</div>
