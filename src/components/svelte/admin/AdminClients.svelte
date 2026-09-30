<script lang="ts">
  type Client = { id: string; name: string; sector: string; img: string; alt: string };

  let items = $state<Client[]>([]);
  let loaded = $state(false);
  let banner = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let name = $state('');
  let sector = $state('');
  let img = $state('');
  let alt = $state('');

  let uploading = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  async function upload(e: Event) {
    const inputEl = e.currentTarget as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;
    uploading = true;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    uploading = false;
    inputEl.value = '';
    if (res.ok && data.url) {
      img = data.url;
      notify('ok', 'LOGO UPLOADED — COMPRESSED TO WEBP');
    } else {
      notify('err', data.error ?? 'UPLOAD FAILED');
    }
  }

  function notify(kind: 'ok' | 'err', text: string) {
    banner = { kind, text };
    setTimeout(() => (banner = null), 4000);
  }

  function startCreate() {
    editingId = null;
    name = '';
    sector = '';
    img = '';
    alt = '';
  }

  function startEdit(item: Client) {
    editingId = item.id;
    name = item.name;
    sector = item.sector;
    img = item.img;
    alt = item.alt;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function load() {
    const res = await fetch('/api/admin/clients');
    if (res.ok) {
      const data = (await res.json()) as { clients: Client[] };
      items = data.clients;
    }
    loaded = true;
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    saving = true;
    const payload = {
      originalId: editingId ?? '',
      id: editingId ?? '',
      name,
      sector,
      img,
      alt,
    };
    const res = await fetch('/api/admin/clients', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    saving = false;
    if (res.ok) {
      notify('ok', editingId ? 'CLIENT UPDATED' : 'CLIENT ADDED');
      startCreate();
      await load();
    } else {
      notify('err', data.error ?? 'SAVE FAILED');
    }
  }

  async function remove(item: Client) {
    if (!window.confirm(`Remove "${item.name}" from the clients wall? This is live immediately.`))
      return;
    const res = await fetch(`/api/admin/clients?id=${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      notify('ok', 'CLIENT REMOVED');
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
      [ CLIENT WALL — {items.length} ]
    </p>
    <ul class="border-t-2 border-concrete-900">
      {#each items as item (item.id)}
        <li class="flex items-start justify-between gap-4 border-b-2 border-concrete-900 py-4">
          <div class="flex items-start gap-4">
            {#if item.img}
              <img
                src={item.img}
                alt={item.alt}
                class="h-12 w-16 border-2 border-concrete-900 bg-white object-contain p-1"
              />
            {:else}
              <div
                class="flex h-12 w-16 items-center justify-center border-2 border-dashed border-concrete-300 text-[8px] tracking-widest text-concrete-300 uppercase"
              >
                NO LOGO
              </div>
            {/if}
            <div>
              <p class="text-lg font-bold uppercase">{item.name}</p>
              <p class="mt-1 text-[10px] tracking-widest text-signal uppercase">{item.sector}</p>
              {#if item.img}<p class="mt-2 text-[10px] tracking-widest text-concrete-600">{item.img}</p>{/if}
            </div>
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
        </li>
      {:else}
        <li class="border-b-2 border-concrete-900 py-4 text-xs tracking-widest uppercase">
          {loaded ? 'NO CLIENTS YET — ADD THE FIRST ONE' : 'LOADING…'}
        </li>
      {/each}
    </ul>
  </div>

  <!-- form -->
  <form onsubmit={save} class="h-fit border-2 border-concrete-900 bg-concrete-50 p-6 shadow-hard lg:col-span-5">
    <p class="text-[10px] tracking-[0.25em] text-concrete-600 uppercase">
      {editingId ? `[ EDITING: ${editingId} ]` : '[ NEW CLIENT ]'}
    </p>

    <label for="cl-name" class="mt-6 block text-[10px] tracking-[0.25em] uppercase">NAME *</label>
    <input
      id="cl-name"
      bind:value={name}
      required
      placeholder="ARUNIKA COFFEE"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <label for="cl-sector" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">SECTOR</label>
    <input
      id="cl-sector"
      bind:value={sector}
      placeholder="F&B / E-COMMERCE"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <label for="cl-img" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">
      LOGO — UPLOAD (AUTO-WEBP) OR PATH, OPTIONAL
    </label>
    <div class="mt-2 flex gap-2">
      <input
        id="cl-img"
        bind:value={img}
        placeholder="/uploads/logo.webp"
        class="w-full min-w-0 flex-1 border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
      />
      <button
        type="button"
        onclick={() => fileInput?.click()}
        disabled={uploading}
        class="shrink-0 cursor-pointer border-2 border-concrete-900 px-3 text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-concrete-900 hover:text-concrete-50 disabled:opacity-50"
      >
        {uploading ? '…' : 'UPLOAD'}
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        onchange={upload}
      />
    </div>

    <label for="cl-alt" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">ALT TEXT</label>
    <input
      id="cl-alt"
      bind:value={alt}
      placeholder="Arunika Coffee — logo"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <div class="mt-8 flex gap-3">
      <button
        type="submit"
        disabled={saving}
        class="cursor-pointer border-2 border-concrete-900 bg-concrete-900 px-5 py-3 text-xs font-bold tracking-[0.2em] text-concrete-50 uppercase shadow-hard-red transition-all hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {editingId ? '[ SAVE CHANGES ]' : '[ ADD CLIENT ]'}
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
