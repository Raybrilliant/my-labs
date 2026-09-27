<script lang="ts">
  type Project = {
    slug: string;
    name: string;
    img: string;
    alt: string;
    year: string;
    type: string;
    desc: string;
    span?: string;
    client: string;
    liveUrl?: string;
    briefIntro: string;
    brief: string[];
    palette: { name: string; hex: string; ink: string }[];
    typefaces: { name: string; role: string; kind: 'display' | 'mono' | 'body' }[];
    design: string[];
    outcome: { value: string; label: string }[];
  };

  let items = $state<Project[]>([]);
  let loaded = $state(false);
  let banner = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

  let editingSlug = $state<string | null>(null);
  let saving = $state(false);

  // simple fields
  let name = $state('');
  let slug = $state('');
  let year = $state('');
  let type = $state('');
  let client = $state('');
  let liveUrl = $state('');
  let img = $state('');
  let alt = $state('');
  let desc = $state('');
  let briefIntro = $state('');

  // line-based compound fields
  let briefRaw = $state('');
  let designRaw = $state('');
  let paletteRaw = $state(''); // Name|#HEX|#ink
  let typefacesRaw = $state(''); // Name|Role|kind
  let outcomeRaw = $state(''); // Value|Label

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
      notify('ok', 'IMAGE UPLOADED — COMPRESSED TO WEBP');
    } else {
      notify('err', data.error ?? 'UPLOAD FAILED');
    }
  }

  function notify(kind: 'ok' | 'err', text: string) {
    banner = { kind, text };
    setTimeout(() => (banner = null), 4000);
  }

  function lines(raw: string): string[] {
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function parsePalette(raw: string) {
    return lines(raw).map((line) => {
      const [pname = '', hex = '', ink = ''] = line.split('|').map((p) => p.trim());
      return { name: pname, hex: hex || '#CCCCCC', ink: ink || '#1A1815' };
    }).filter((s) => s.name);
  }

  function parseTypefaces(raw: string) {
    return lines(raw).map((line) => {
      const [tname = '', trole = '', kind = ''] = line.split('|').map((p) => p.trim());
      const safeKind = ['display', 'mono', 'body'].includes(kind) ? kind : 'display';
      return { name: tname, role: trole, kind: safeKind as 'display' | 'mono' | 'body' };
    }).filter((t) => t.name);
  }

  function parseOutcome(raw: string) {
    return lines(raw).map((line) => {
      const [value = '', label = ''] = line.split('|').map((p) => p.trim());
      return { value, label };
    }).filter((o) => o.value || o.label);
  }

  function startCreate() {
    editingSlug = null;
    name = '';
    slug = '';
    year = String(new Date().getFullYear());
    type = '';
    client = '';
    liveUrl = '';
    img = '';
    alt = '';
    desc = '';
    briefIntro = '';
    briefRaw = '';
    designRaw = '';
    paletteRaw = '';
    typefacesRaw = '';
    outcomeRaw = '';
  }

  function startEdit(item: Project) {
    editingSlug = item.slug;
    name = item.name;
    slug = item.slug;
    year = item.year;
    type = item.type;
    client = item.client;
    liveUrl = item.liveUrl ?? '';
    img = item.img;
    alt = item.alt;
    desc = item.desc;
    briefIntro = item.briefIntro;
    briefRaw = item.brief.join('\n');
    designRaw = item.design.join('\n');
    paletteRaw = item.palette.map((s) => `${s.name}|${s.hex}|${s.ink}`).join('\n');
    typefacesRaw = item.typefaces.map((t) => `${t.name}|${t.role}|${t.kind}`).join('\n');
    outcomeRaw = item.outcome.map((o) => `${o.value}|${o.label}`).join('\n');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function load() {
    const res = await fetch('/api/admin/projects');
    if (res.ok) {
      const data = (await res.json()) as { projects: Project[] };
      items = data.projects;
    }
    loaded = true;
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    saving = true;
    const payload: Record<string, unknown> = {
      originalSlug: editingSlug ?? '',
      slug: slug || name,
      name,
      year,
      type,
      client,
      liveUrl,
      img,
      alt,
      desc,
      briefIntro,
      brief: lines(briefRaw),
      design: lines(designRaw),
      palette: parsePalette(paletteRaw),
      typefaces: parseTypefaces(typefacesRaw),
      outcome: parseOutcome(outcomeRaw),
    };
    const res = await fetch('/api/admin/projects', {
      method: editingSlug ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    saving = false;
    if (res.ok) {
      notify('ok', editingSlug ? 'PROJECT UPDATED' : 'PROJECT ADDED');
      startCreate();
      await load();
    } else {
      notify('err', data.error ?? 'SAVE FAILED');
    }
  }

  async function remove(item: Project) {
    if (!window.confirm(`Delete project "${item.name}"? This is live immediately.`)) return;
    const res = await fetch(`/api/admin/projects?slug=${encodeURIComponent(item.slug)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      notify('ok', 'PROJECT DELETED');
      if (editingSlug === item.slug) startCreate();
      await load();
    } else {
      notify('err', 'DELETE FAILED');
    }
  }

  const inputCls =
    'mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal';
  const labelCls = 'mt-5 block text-[10px] tracking-[0.25em] uppercase';

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

<section class="grid gap-10 xl:grid-cols-12">
  <!-- list -->
  <div class="xl:col-span-5">
    <p class="mb-4 text-[10px] tracking-[0.25em] text-concrete-600 uppercase">
      [ CURRENT PROJECTS — {items.length} ]
    </p>
    <ul class="border-t-2 border-concrete-900">
      {#each items as item (item.slug)}
        <li class="border-b-2 border-concrete-900 py-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-lg font-bold uppercase">{item.name}</p>
              <p class="mt-1 text-[10px] tracking-widest text-signal uppercase">
                {item.year} — {item.type}
              </p>
              <p class="mt-1 text-[10px] tracking-widest text-concrete-600">/projects/{item.slug}</p>
              {#if item.liveUrl}
                <p class="mt-1 text-[10px] tracking-widest text-concrete-600">LIVE: {item.liveUrl}</p>
              {/if}
            </div>
            <div class="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onclick={() => startEdit(item)}
                class="cursor-pointer border-2 border-concrete-900 px-3 py-1 text-[10px] tracking-widest uppercase transition-colors hover:bg-concrete-900 hover:text-concrete-50"
              >
                EDIT
              </button>
              <a
                href={`/projects/${item.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                class="border-2 border-concrete-900 px-3 py-1 text-center text-[10px] tracking-widest uppercase transition-colors hover:bg-concrete-900 hover:text-concrete-50"
              >
                VIEW
              </a>
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
          {loaded ? 'NO PROJECTS YET — ADD THE FIRST ONE' : 'LOADING…'}
        </li>
      {/each}
    </ul>
  </div>

  <!-- form -->
  <form onsubmit={save} class="h-fit border-2 border-concrete-900 bg-concrete-50 p-6 shadow-hard xl:col-span-7">
    <p class="text-[10px] tracking-[0.25em] text-concrete-600 uppercase">
      {editingSlug ? `[ EDITING: ${editingSlug} ]` : '[ NEW PROJECT ]'}
    </p>

    <div class="grid gap-x-5 md:grid-cols-2">
      <div>
        <label for="pj-name" class={labelCls}>NAME *</label>
        <input id="pj-name" bind:value={name} required class={inputCls} />
      </div>
      <div>
        <label for="pj-slug" class={labelCls}>SLUG — AUTO IF EMPTY</label>
        <input id="pj-slug" bind:value={slug} placeholder="my-project" class={inputCls} />
      </div>
      <div>
        <label for="pj-year" class={labelCls}>YEAR</label>
        <input id="pj-year" bind:value={year} class={inputCls} />
      </div>
      <div>
        <label for="pj-type" class={labelCls}>TYPE LABEL</label>
        <input id="pj-type" bind:value={type} placeholder="E-COMMERCE" class={inputCls} />
      </div>
      <div>
        <label for="pj-client" class={labelCls}>CLIENT</label>
        <input id="pj-client" bind:value={client} class={inputCls} />
      </div>
      <div>
        <label for="pj-live" class={labelCls}>LIVE URL — OPTIONAL</label>
        <input
          id="pj-live"
          bind:value={liveUrl}
          placeholder="https://…"
          class={inputCls}
        />
      </div>
      <div>
        <label for="pj-img" class={labelCls}>IMAGE — UPLOAD (AUTO-WEBP) OR PATH</label>
        <div class="flex gap-2">
          <input
            id="pj-img"
            bind:value={img}
            placeholder="/projects/my-project.svg"
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
      </div>
      <div>
        <label for="pj-alt" class={labelCls}>ALT TEXT</label>
        <input id="pj-alt" bind:value={alt} class={inputCls} />
      </div>
    </div>

    <label for="pj-desc" class={labelCls}>CARD DESCRIPTION</label>
    <textarea id="pj-desc" bind:value={desc} rows="3" class={inputCls}></textarea>

    <label for="pj-briefintro" class={labelCls}>CASE-STUDY BRIEF INTRO</label>
    <textarea id="pj-briefintro" bind:value={briefIntro} rows="3" class={inputCls}></textarea>

    <label for="pj-brief" class={labelCls}>THE BRIEF — ONE LINE PER ITEM</label>
    <textarea
      id="pj-brief"
      bind:value={briefRaw}
      rows="4"
      placeholder={'ZERO TEMPLATES\nNO STOCK PHOTOS'} class={inputCls}></textarea>

    <label for="pj-design" class={labelCls}>DESIGN — ONE LINE PER ITEM</label>
    <textarea id="pj-design" bind:value={designRaw} rows="4" class={inputCls}></textarea>

    <label for="pj-palette" class={labelCls}>PALETTE — NAME | #HEX | #ink PER LINE</label>
    <textarea
      id="pj-palette"
      bind:value={paletteRaw}
      rows="4"
      placeholder={'RAW PAPER|#F5F3EF|#1A1815\nSIGNAL RED|#FF2E1F|#F5F3EF'} class={inputCls}></textarea>

    <label for="pj-typefaces" class={labelCls}>TYPE — NAME | ROLE | KIND PER LINE (display/mono/body)</label>
    <textarea
      id="pj-typefaces"
      bind:value={typefacesRaw}
      rows="3"
      placeholder={'SPACE GROTESK|DISPLAY|display\nIBM PLEX MONO|DATA|mono'} class={inputCls}></textarea>

    <label for="pj-outcome" class={labelCls}>OUTCOME — VALUE | LABEL PER LINE</label>
    <textarea
      id="pj-outcome"
      bind:value={outcomeRaw}
      rows="3"
      placeholder={'+48%|CONVERSION\n-22%|CART ABANDONMENT'} class={inputCls}></textarea>

    <div class="mt-8 flex gap-3">
      <button
        type="submit"
        disabled={saving}
        class="cursor-pointer border-2 border-concrete-900 bg-concrete-900 px-5 py-3 text-xs font-bold tracking-[0.2em] text-concrete-50 uppercase shadow-hard-red transition-all hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {editingSlug ? '[ SAVE CHANGES ]' : '[ ADD PROJECT ]'}
      </button>
      {#if editingSlug}
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
