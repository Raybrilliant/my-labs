<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap, prefersReducedMotion } from '../../utils/gsap';

  interface Step {
    n: string;
    title: string;
    desc: string;
    deliverables: string[];
  }

  const steps: Step[] = [
    {
      n: '01',
      title: 'DISCOVER',
      desc: 'A tight kickoff call, uncomfortable questions, and a scope everyone actually agrees on. No 40-page proposals — one document that says what we build, when, and for how much.',
      deliverables: ['SCOPE DOC', 'TIMELINE', 'FIXED QUOTE'],
    },
    {
      n: '02',
      title: 'DESIGN',
      desc: 'Wireframes to high-fidelity fast, with a bold direction chosen early so we are not redesigning at week six. You see progress in Figma, comment in context, and we move.',
      deliverables: ['WIREFRAMES', 'UI DESIGN', 'PROTOTYPE'],
    },
    {
      n: '03',
      title: 'DEVELOP',
      desc: 'Clean code in short sprints with a staging link from day one — you watch it grow. Weekly demos, honest changelogs, zero silent scope creep.',
      deliverables: ['STAGING URL', 'WEEKLY DEMOS', 'CLEAN REPO'],
    },
    {
      n: '04',
      title: 'DEPLOY',
      desc: 'Launch day without the cold sweat. Performance budgets, analytics, SEO basics and monitoring wired in before we flip the switch — then we watch it together.',
      deliverables: ['CI/CD', 'ANALYTICS', 'LAUNCH CHECK'],
    },
    {
      n: '05',
      title: 'SUPPORT',
      desc: 'After launch we stay in radar range: fixes, iterations and honest advice when you want to grow it. No ghosting, no surprise invoices.',
      deliverables: ['BUG FIXES', 'ITERATIONS', 'OFFICE HOURS'],
    },
  ];

  let sectionEl: HTMLElement;
  let lineEl: HTMLDivElement;

  onMount(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // Red progress line draws itself as you scroll the timeline
      gsap.fromTo(
        lineEl,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionEl,
            start: 'top 65%',
            end: 'bottom 70%',
            scrub: true,
          },
        }
      );

      gsap.utils.toArray<HTMLElement>('[data-step]').forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, x: -36 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 84%' },
          }
        );
      });
    }, sectionEl);
    return () => ctx.revert();
  });
</script>

<section id="process" class="section-pad border-b-2 border-concrete-900 bg-concrete-100">
  <div bind:this={sectionEl} class="shell grid gap-12 md:grid-cols-[minmax(0,340px)_1fr] md:gap-20">
    <div class="md:sticky md:top-28 md:self-start">
      <p class="font-mono text-xs tracking-[0.3em] text-concrete-600 uppercase" data-reveal>
        [ 04 / PROCESS ]
      </p>
      <h2
        class="mt-5 font-display text-concrete-900 uppercase leading-[0.92] text-[clamp(2.6rem,7.5vw,6.5rem)]"
      >
        <span class="block overflow-hidden"
          ><span data-reveal="clip" class="block">NO</span></span
        >
        <span class="block overflow-hidden"
          ><span data-reveal="clip" data-reveal-delay="0.08" class="block">
            <span class="text-stroke-black">CHAOS</span></span
          ></span
        >
        <span class="block overflow-hidden"
          ><span data-reveal="clip" data-reveal-delay="0.16" class="block text-signal"
            >JUST SHIP</span
          ></span
        >
      </h2>
      <p class="mt-6 max-w-xs text-sm leading-relaxed text-concrete-600" data-reveal>
        Five steps. Fixed scope, fixed price, weekly proof of progress. You always know what
        is happening and what happens next.
      </p>
    </div>

    <ol class="relative border-l-2 border-concrete-900 pl-8 md:pl-14">
      <div
        bind:this={lineEl}
        class="absolute top-0 left-[-2px] h-full w-[2px] origin-top bg-signal"
        aria-hidden="true"
      ></div>

      {#each steps as step, i (step.n)}
        <li
          data-step
          class="group relative pb-14 md:pb-20 {i === steps.length - 1 ? 'pb-0' : ''}"
        >
          <span
            class="absolute top-1.5 left-[-41px] h-3.5 w-3.5 border-2 border-concrete-900 bg-concrete-50 transition-colors duration-200 group-hover:bg-signal md:left-[-65px]"
            aria-hidden="true"></span>
          <p class="font-mono text-xs tracking-[0.3em] text-signal">{step.n}</p>
          <h3
            class="mt-2 font-display text-concrete-900 uppercase leading-none text-[clamp(1.9rem,4.5vw,3.75rem)]"
          >
            {step.title}
          </h3>
          <p class="mt-4 max-w-xl leading-relaxed text-concrete-600">{step.desc}</p>
          <ul class="mt-4 flex flex-wrap gap-2">
            {#each step.deliverables as item (item)}
              <li
                class="border border-concrete-900 bg-concrete-50 px-2 py-1 font-mono text-[10px] tracking-widest text-concrete-900"
              >
                {item}
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  </div>
</section>
