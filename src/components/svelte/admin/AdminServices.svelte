<script lang="ts">
  type Service = { id: string; title: string; desc: string; tags: string[] };

  let items = $state<Service[]>([]);
  let loaded = $state(false);
  let banner = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let title = $state('');
  let desc = $state('');
  let tagsRaw = $state('');

  function notify(kind: 'ok' | 'err', text: string) {
    banner = { kind, text };
    setTimeout(() => (banner = null), 4000);
  }

  function parseTags(raw: string): string[] {
    return raw
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  }

  function startCreate() {
    editingId = null;
    title = '';
    desc = '';
    tagsRaw = '';
  }

  function startEdit(item: Service) {
    editingId = item.id;
    title = item.title;
    desc = item.desc;
    tagsRaw = item.tags.join(', ');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function load() {
    const res = await fetch('/api/admin/services');
    if (res.ok) {
      const data = (await res.json()) as { services: Service[] };
      items = data.services;
    }
    loaded = true;
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    saving = true;
    const payload = {
      originalId: editingId ?? '',
      id: editingId ?? '',
      title,
      desc,
      tags: parseTags(tagsRaw),
    };
    const res = await fetch('/api/admin/services', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    saving = false;
    if (res.ok) {
      notify('ok', editingId ? 'SERVICE UPDATED' : 'SERVICE ADDED');
      startCreate();
      await load();
    } else {
      notify('err', data.error ?? 'SAVE FAILED');
    }
  }

  async function remove(item: Service) {
    if (!window.confirm(`Delete service "${item.title}"? This is live immediately.`)) return;
    const res = await fetch(`/api/admin/services?id=${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      notify('ok', 'SERVICE DELETED');
      if (editingId === item.id) startCreate();
      await load();
    } else {
      notify('err', 'DELETE FAILED');
    }
  }

  load();
</script>

{#if banner}
  <p
    class="mb-6 border-2 px-4 py-3 text-xs font-bold tracking-widest uppercase {banner.kind ===
    'ok'
      ? 'border-concrete-900 bg-concrete-50'
      : 'border-signal bg-signal text-concrete-50'}"
  >
    {banner.kind === 'ok' ? '✓ ' : '! '}
    {banner.text}
  </p>
{/if}

<section class="grid gap-10 lg:grid-cols-12">
  <!-- list -->
  <div class="lg:col-span-7">
    <p class="mb-4 text-[10px] tracking-[0.25em] text-concrete-600 uppercase">
      [ CURRENT SERVICES — {items.length} ]
    </p>
    <ul class="border-t-2 border-concrete-900">
      {#each items as item (item.id)}
        <li class="border-b-2 border-concrete-900 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-lg font-bold uppercase">{item.title}</p>
              <p class="mt-1 text-[10px] tracking-widest text-signal uppercase">
                [{item.tags.join(' / ')}]
              </p>
              <p class="mt-2 max-w-lg text-xs leading-relaxed text-concrete-600">{item.desc}</p>
            </div>
            <div class="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onclick={() => startEdit(item)}
                class="cursor-pointer border-2 border-concrete-900 px-3 py-1 text-[10px] tracking-widest uppercase transition-colors hover:bg-concrete-900 hover:text-concrete-50"
              >
                EDIT
              </button>
              <button
                type="button"
                onclick={() => remove(item)}
                class="cursor-pointer border-2 border-concrete-900 px-3 py-1 text-[10px] tracking-widest uppercase transition-colors hover:border-signal hover:bg-signal hover:text-concrete-50"
              >
                DEL
              </button>
            </div>
          </div>
        </li>
      {:else}
        <li class="border-b-2 border-concrete-900 py-4 text-xs tracking-widest uppercase">
          {loaded ? 'NO SERVICES YET — ADD THE FIRST ONE' : 'LOADING…'}
        </li>
      {/each}
    </ul>
  </div>

  <!-- form -->
  <form onsubmit={save} class="h-fit border-2 border-concrete-900 bg-concrete-50 p-6 shadow-hard lg:col-span-5">
    <p class="text-[10px] tracking-[0.25em] text-concrete-600 uppercase">
      {editingId ? `[ EDITING: ${editingId} ]` : '[ NEW SERVICE ]'}
    </p>

    <label for="svc-title" class="mt-6 block text-[10px] tracking-[0.25em] uppercase">TITLE *</label>
    <input
      id="svc-title"
      bind:value={title}
      required
      placeholder="WEB DEVELOPMENT"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <label for="svc-desc" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">DESCRIPTION</label>
    <textarea
      id="svc-desc"
      bind:value={desc}
      rows="4"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"></textarea>

    <label for="svc-tags" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">
      TAGS — COMMA SEPARATED
    </label>
    <input
      id="svc-tags"
      bind:value={tagsRaw}
      placeholder="FAST, SEO-READY, CONVERSION-FIRST"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <div class="mt-8 flex gap-3">
      <button
        type="submit"
        disabled={saving}
        class="cursor-pointer border-2 border-concrete-900 bg-concrete-900 px-5 py-3 text-xs font-bold tracking-[0.2em] text-concrete-50 uppercase shadow-hard-red transition-all hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {editingId ? '[ SAVE CHANGES ]' : '[ ADD SERVICE ]'}
      </button>
      {#if editingId}
        <button
          type="button"
          onclick={startCreate}
          class="cursor-pointer border-2 border-concrete-900 px-5 py-3 text-xs font-bold tracking-[0.2em] uppercase transition-colors hover:bg-concrete-900 hover:text-concrete-50"
        >
          CANCEL
        </button>
      {/if}
    </div>
  </form>
</section>
