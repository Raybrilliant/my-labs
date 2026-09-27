<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap, prefersReducedMotion } from '../../utils/gsap';

  type Status = 'idle' | 'sending' | 'success' | 'error';

  const PROJECT_TYPES = ['WEBSITE', 'WEB APP', 'MOBILE APP', 'MVP', 'OTHER'];
  const BUDGETS = ['< $5K', '$5–15K', '$15–50K', '$50K+'];

  let status = $state<Status>('idle');
  let errorMsg = $state('');

  let name = $state('');
  let email = $state('');
  let projectType = $state('');
  let budget = $state('');
  let message = $state('');
  let company = $state(''); // honeypot — humans never see or fill this

  let formEl: HTMLFormElement;
  let wrapEl: HTMLElement;

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const buttonLabel = $derived(
    status === 'sending'
      ? '[ TRANSMITTING… ]'
      : status === 'success'
        ? '[ SENT ✓ ]'
        : status === 'error'
          ? '[ FAILED — RETRY ]'
          : '[ SEND IT → ]'
  );

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (status === 'sending' || status === 'success') return;

    status = 'sending';
    errorMsg = '';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          projectType,
          budget,
          message,
          company,
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Transmission failed. Try email instead.');
      }
      status = 'success';
    } catch (err) {
      status = 'error';
      errorMsg = err instanceof Error ? err.message : 'Something went wrong.';
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          formEl,
          { x: 0 },
          { x: 10, duration: 0.06, repeat: 7, yoyo: true, ease: 'none', clearProps: 'x' }
        );
      }
    }
  }

  function resetForm() {
    status = 'idle';
    errorMsg = '';
    name = '';
    email = '';
    projectType = '';
    budget = '';
    message = '';
  }

  onMount(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-form-block]',
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: wrapEl, start: 'top 80%' },
        }
      );
    }, wrapEl);
    return () => ctx.revert();
  });
</script>

<div bind:this={wrapEl} class="grid gap-12 lg:grid-cols-12 lg:gap-16">
  <!-- Form -->
  <form
    bind:this={formEl}
    onsubmit={handleSubmit}
    class="lg:col-span-7"
    novalidate
    aria-label="Project inquiry"
  >
    <fieldset class="grid gap-8 md:grid-cols-2" disabled={status === 'sending'}>
      <div data-form-block>
        <label class="field-label" for="cf-name">NAME *</label>
        <input
          id="cf-name"
          class="field-input"
          type="text"
          autocomplete="name"
          placeholder="ADA LOVELACE"
          bind:value={name}
          required
          maxlength={200}
        />
      </div>

      <div data-form-block>
        <label class="field-label" for="cf-email">EMAIL *</label>
        <input
          id="cf-email"
          class="field-input"
          type="email"
          autocomplete="email"
          placeholder="ADA@ANALYTICAL.ENG"
          bind:value={email}
          required
          maxlength={320}
        />
      </div>

      <fieldset data-form-block class="md:col-span-2">
        <legend class="field-label">PROJECT TYPE</legend>
        <div class="flex flex-wrap gap-2 pt-1">
          {#each PROJECT_TYPES as t (t)}
            <input
              type="radio"
              class="sr-only"
              id="pt-{slug(t)}"
              name="projectType"
              value={t}
              bind:group={projectType}
            />
            <label class="radio-pill" for="pt-{slug(t)}">{t}</label>
          {/each}
        </div>
      </fieldset>

      <fieldset data-form-block class="md:col-span-2">
        <legend class="field-label">BUDGET RANGE (USD)</legend>
        <div class="flex flex-wrap gap-2 pt-1">
          {#each BUDGETS as b (b)}
            <input
              type="radio"
              class="sr-only"
              id="bg-{slug(b)}"
              name="budget"
              value={b}
              bind:group={budget}
            />
            <label class="radio-pill" for="bg-{slug(b)}">{b}</label>
          {/each}
        </div>
      </fieldset>

      <div data-form-block class="md:col-span-2">
        <label class="field-label" for="cf-message">THE BRIEF *</label>
        <textarea
          id="cf-message"
          class="field-input resize-y"
          rows="4"
          placeholder="WHAT ARE WE BUILDING? GO WILD."
          bind:value={message}
          required
          maxlength={5000}
        ></textarea>
      </div>

      <!-- Honeypot: visually hidden, bots love filling every input -->
      <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label for="cf-company">Company</label>
        <input
          id="cf-company"
          type="text"
          tabindex={-1}
          autocomplete="off"
          bind:value={company}
        />
      </div>

      <div data-form-block class="md:col-span-2">
        <button type="submit" class="btn-brutal" disabled={status === 'sending' || status === 'success'}>
          {buttonLabel}
        </button>

        <p class="mt-4 min-h-5 font-mono text-xs" aria-live="polite">
          {#if status === 'error'}
            <span class="text-signal">✗ {errorMsg}</span>
          {:else if status === 'success'}
            <span class="text-concrete-600"
              >✓ RECEIVED. WE REPLY WITHIN 48H — CHECK YOUR INBOX (AND SPAM, ONCE).</span
            >
          {:else}
            <span class="text-concrete-600">* REQUIRED FIELDS. NO NEWSLETTERS. EVER.</span>
          {/if}
        </p>

        {#if status === 'success'}
          <button
            type="button"
            class="mt-3 font-mono text-xs tracking-widest text-concrete-900 underline decoration-2 underline-offset-4 uppercase hover:text-signal"
            onclick={resetForm}
          >
            SEND ANOTHER →
          </button>
        {/if}
      </div>
    </fieldset>
  </form>

  <!-- Direct channels -->
  <aside class="lg:col-span-5">
    <div
      data-form-block
      class="border-2 border-concrete-900 bg-concrete-900 p-6 text-concrete-50 shadow-hard md:p-8"
    >
      <p class="font-mono text-[11px] tracking-[0.3em] text-concrete-300 uppercase">
        [ DIRECT CHANNELS ]
      </p>
      <ul class="mt-6 space-y-5 font-mono text-sm">
        <li>
          <p class="text-[10px] tracking-[0.25em] text-concrete-300">EMAIL</p>
          <a
            href="mailto:hello@raybrilliant.my.id"
            class="text-concrete-50 underline decoration-2 decoration-signal underline-offset-4 transition-colors hover:text-signal"
          >
            hello@raybrilliant.my.id
          </a>
        </li>
        <li>
          <p class="text-[10px] tracking-[0.25em] text-concrete-300">RESPONSE TIME</p>
          <p class="text-concrete-50">&lt; 48 HOURS — USUALLY WAY LESS</p>
        </li>
        <li>
          <p class="text-[10px] tracking-[0.25em] text-concrete-300">TIMEZONE</p>
          <p class="text-concrete-50">GMT+7 (PROBOLINGGO) — OVERLAP WITH EU &amp; US</p>
        </li>
      </ul>
      <p class="mt-8 border-t border-concrete-600 pt-4 font-mono text-[10px] leading-relaxed tracking-widest text-concrete-300 uppercase">
        FIRST CONSULT IS FREE. IF WE ARE NOT THE RIGHT LAB FOR IT, WE SAY SO AND POINT YOU
        SOMEONE WHO IS.
      </p>
    </div>
  </aside>
</div>
