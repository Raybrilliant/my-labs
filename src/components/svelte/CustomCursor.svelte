<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap, prefersReducedMotion } from '../../utils/gsap';

  let rootEl: HTMLDivElement;
  let dotEl: HTMLDivElement;
  let ringEl: HTMLDivElement;
  let labelEl: HTMLDivElement;

  onMount(() => {
    // Custom cursor: desktop pointers only, skipped for reduced motion
    if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return;

    document.documentElement.classList.add('cursor-on');

    const ctx = gsap.context(() => {
      gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50, force3D: true });
      gsap.set(labelEl, { xPercent: 0, yPercent: -50, force3D: true });

      const dotX = gsap.quickTo(dotEl, 'x', { duration: 0.12, ease: 'power2.out' });
      const dotY = gsap.quickTo(dotEl, 'y', { duration: 0.12, ease: 'power2.out' });
      const ringX = gsap.quickTo(ringEl, 'x', { duration: 0.38, ease: 'power2.out' });
      const ringY = gsap.quickTo(ringEl, 'y', { duration: 0.38, ease: 'power2.out' });
      const labelX = gsap.quickTo(labelEl, 'x', { duration: 0.16, ease: 'power2.out' });
      const labelY = gsap.quickTo(labelEl, 'y', { duration: 0.16, ease: 'power2.out' });

      let shown = false;
      const onMove = (e: MouseEvent) => {
        if (!shown) {
          shown = true;
          gsap.to(rootEl, { opacity: 1, duration: 0.2 });
        }
        dotX(e.clientX);
        dotY(e.clientY);
        ringX(e.clientX);
        ringY(e.clientY);
        labelX(e.clientX + 26);
        labelY(e.clientY);
      };

      let hovered: Element | null = null;

      const onOver = (e: MouseEvent) => {
        const target = (e.target as Element | null)?.closest?.(
          'a, button, label, summary, [data-cursor]'
        ) ?? null;
        if (target === hovered) return;
        hovered = target;

        if (target) {
          // Solid signal red on hover — blend mode off so it stays pure red
          rootEl.classList.remove('mix-blend-difference');
          gsap.to(dotEl, {
            scale: 3.2,
            backgroundColor: '#ff2e1f',
            duration: 0.18,
            ease: 'power2.out',
          });
          gsap.to(ringEl, { scale: 1.7, borderColor: '#ff2e1f', duration: 0.25 });
          const text = target.getAttribute('data-cursor-label');
          if (text) {
            labelEl.textContent = text;
            gsap.to(labelEl, { opacity: 1, duration: 0.15 });
          }
        } else {
          // Back to adaptive white (difference blend on the root = visible on
          // any section background: dark on concrete, light on the dark footer)
          rootEl.classList.add('mix-blend-difference');
          gsap.to(dotEl, {
            scale: 1,
            backgroundColor: '#ffffff',
            duration: 0.2,
            ease: 'power2.out',
          });
          gsap.to(ringEl, {
            scale: 1,
            borderColor: 'rgba(255, 255, 255, 0.6)',
            duration: 0.25,
          });
          gsap.to(labelEl, { opacity: 0, duration: 0.15 });
        }
      };

      const onLeave = () => gsap.to(rootEl, { opacity: 0, duration: 0.2 });
      const onEnter = () => shown && gsap.to(rootEl, { opacity: 1, duration: 0.2 });

      window.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('mouseover', onOver, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
      document.documentElement.addEventListener('mouseenter', onEnter);

      return () => {
        window.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseover', onOver);
        document.documentElement.removeEventListener('mouseleave', onLeave);
        document.documentElement.removeEventListener('mouseenter', onEnter);
        document.documentElement.classList.remove('cursor-on');
      };
    }, rootEl);

    return () => ctx.revert();
  });
</script>

<div
  bind:this={rootEl}
  class="mix-blend-difference pointer-events-none fixed inset-0 z-100 opacity-0"
  aria-hidden="true"
>
  <div
    bind:this={ringEl}
    class="absolute top-0 left-0 h-8 w-8 rounded-full border-2 border-white/60"
  ></div>
  <div
    bind:this={dotEl}
    class="absolute top-0 left-0 h-2.5 w-2.5 rounded-full bg-white"
  ></div>
  <div
    bind:this={labelEl}
    class="absolute top-0 left-0 border border-concrete-900 bg-signal px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-concrete-50 opacity-0"
  >
    VIEW
  </div>
</div>
