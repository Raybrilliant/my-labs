<script lang="ts">
  import { tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import { gsap, prefersReducedMotion } from '../../utils/gsap';

  type Status = 'idle' | 'sending' | 'success' | 'error';

  const ROLES = ['ENGINEER', 'DESIGNER', 'INTERN', 'OTHER'];

  let open = $state(false);
  let status = $state<Status>('idle');
  let errorMsg = $state('');

  let name = $state('');
  let email = $state('');
  let role = $state('');
  let portfolio = $state('');
  let message = $state('');
  let website = $state(''); // honeypot — humans never see or fill this

  let formEl: HTMLFormElement | undefined = $state();
  let nameEl: HTMLInputElement | undefined = $state();

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const reduced = prefersReducedMotion();

  const toggleLabel = $derived(open ? '[ CLOSE × ]' : '[ PITCH US → ]');

  const submitLabel = $derived(
    status === 'sending'
      ? '[ TRANSMITTING… ]'
      : status === 'success'
        ? '[ SENT ✓ ]'
        : status === 'error'
          ? '[ FAILED — RETRY ]'
          : '[ SEND PITCH → ]'
  );

  async function toggle() {
    open = !open;
    if (open) {
      await tick();
      nameEl?.focus();
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (status === 'sending' || status === 'success') return;

    status = 'sending';
    errorMsg = '';

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, portfolio, message, website }),
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Transmission failed. Try email instead.');
      }
      status = 'success';
      name = '';
      email = '';
      role = '';
      portfolio = '';
      message = '';
    } catch (err) {
      status = 'error';
      errorMsg = err instanceof Error ? err.message : 'Something went wrong.';
      if (!prefersReducedMotion() && formEl) {
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
  }
</script>

<div
  class="group flex flex-col border-2 border-dashed border-concrete-600 p-7 transition-colors duration-200 hover:border-signal md:p-10"
  data-reveal
  data-cursor-label={open ? null : 'PITCH US →'}
>
  <div>
    <p class="font-mono text-xs tracking-[0.3em] text-concrete-600 uppercase">
      [ OPEN COLLAB SLOT ]
    </p>
    <p class="mt-4 font-display text-concrete-900 uppercase leading-none text-[clamp(3rem,7vw,5.5rem)] transition-colors duration-200 group-hover:text-signal">
      THIS SEAT
      <br />
      COULD BE
      <span class="text-stroke-black group-hover:text-signal">
        YOURS
      </span>
    </p>
    <p class="mt-5 max-w-md text-sm leading-relaxed text-concrete-600">
      We occasionally pull in engineers, designers and interns who ship and
      care. No cover letters — send work or a wild idea.
    </p>
  </div>

  <button
    type="button"
    class="btn-brutal mt-8 w-fit"
    aria-expanded={open}
    aria-controls={open ? 'jf-panel' : undefined}
    onclick={toggle}
  >
    {toggleLabel}
  </button>

  {#if open}
    <div
      id="jf-panel"
      class="mt-8 border-t-2 border-concrete-900 pt-8"
      transition:slide={{ duration: reduced ? 0 : 400 }}
    >
      <form bind:this={formEl} onsubmit={handleSubmit} aria-label="Pitch yourself to the lab">
        <fieldset class="grid gap-7" disabled={status === 'sending'}>
          <div class="grid gap-7 md:grid-cols-2">
            <div>
              <label class="field-label" for="jf-name">NAME *</label>
              <input
                bind:this={nameEl}
                id="jf-name"
                class="field-input"
                type="text"
                autocomplete="name"
                placeholder="INI BUDI"
                bind:value={name}
                required
                maxlength={200}
              />
            </div>

            <div>
              <label class="field-label" for="jf-email">EMAIL *</label>
              <input
                id="jf-email"
                class="field-input"
                type="email"
                autocomplete="email"
                placeholder="BUDI@SANTOSO.IND"
                bind:value={email}
                required
                maxlength={320}
              />
            </div>
          </div>

          <fieldset>
            <legend class="field-label">WHAT DO YOU DO?</legend>
            <div class="flex flex-wrap gap-2 pt-1">
              {#each ROLES as r (r)}
                <input
                  type="radio"
                  class="sr-only"
                  id="jf-role-{slug(r)}"
                  name="role"
                  value={r}
                  bind:group={role}
                />
                <label class="radio-pill" for="jf-role-{slug(r)}">{r}</label>
              {/each}
            </div>
          </fieldset>

          <div>
            <label class="field-label" for="jf-portfolio">PORTFOLIO / GITHUB / DRIBBBLE</label>
            <input
              id="jf-portfolio"
              class="field-input"
              type="text"
              inputmode="url"
              placeholder="GITHUB.COM/YOU — OPTIONAL"
              bind:value={portfolio}
              maxlength={300}
            />
          </div>

          <div>
            <label class="field-label" for="jf-message">THE PITCH *</label>
            <textarea
              id="jf-message"
              class="field-input resize-y"
              rows="4"
              placeholder="WHAT HAVE YOU SHIPPED? WHAT DO YOU WANT TO BUILD HERE? WILD IDEAS COUNT."
              bind:value={message}
              required
              maxlength={5000}
            ></textarea>
          </div>

          <!-- Honeypot: visually hidden, bots love filling every input -->
          <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label for="jf-website">Website</label>
            <input
              id="jf-website"
              type="text"
              tabindex={-1}
              autocomplete="off"
              bind:value={website}
            />
          </div>

          <div>
            <button
              type="submit"
              class="btn-brutal"
              disabled={status === 'sending' || status === 'success'}
            >
              {submitLabel}
            </button>

            <p class="mt-4 min-h-5 font-mono text-xs" aria-live="polite">
              {#if status === 'error'}
                <span class="text-signal">✗ {errorMsg}</span>
              {:else if status === 'success'}
                <span class="text-concrete-600"
                  >✓ PITCH RECEIVED. WE READ EVERYTHING — IF IT CLICKS, YOU'LL HEAR FROM US
                  WITHIN 48H.</span
                >
              {:else}
                <span class="text-concrete-600">* REQUIRED. NO COVER LETTERS. NO DEAD AIR.</span>
              {/if}
            </p>

            {#if status === 'success'}
              <button
                type="button"
                class="mt-3 font-mono text-xs tracking-widest text-concrete-900 underline decoration-2 underline-offset-4 uppercase hover:text-signal"
                onclick={resetForm}
              >
                PITCH AGAIN →
              </button>
            {/if}
          </div>
        </fieldset>
      </form>
    </div>
  {/if}
</div>
