<script lang="ts">
  type TeamMember = { id: string; name: string; role: string; bio: string; img: string; alt: string };

  let items = $state<TeamMember[]>([]);
  let loaded = $state(false);
  let banner = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let name = $state('');
  let role = $state('');
  let bio = $state('');
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
      notify('ok', 'IMAGE UPLOADED — COMPRESSED TO WEBP');
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
    role = '';
    bio = '';
    img = '';
    alt = '';
  }

  function startEdit(item: TeamMember) {
    editingId = item.id;
    name = item.name;
    role = item.role;
    bio = item.bio;
    img = item.img;
    alt = item.alt;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function load() {
    const res = await fetch('/api/admin/team');
    if (res.ok) {
      const data = (await res.json()) as { team: TeamMember[] };
      items = data.team;
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
      role,
      bio,
      img,
      alt,
    };
    const res = await fetch('/api/admin/team', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    saving = false;
    if (res.ok) {
      notify('ok', editingId ? 'MEMBER UPDATED' : 'MEMBER ADDED');
      startCreate();
      await load();
    } else {
      notify('err', data.error ?? 'SAVE FAILED');
    }
  }

  async function remove(item: TeamMember) {
    if (!window.confirm(`Remove "${item.name}" from the team page? This is live immediately.`))
      return;
    const res = await fetch(`/api/admin/team?id=${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      notify('ok', 'MEMBER REMOVED');
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
      [ CURRENT CREW — {items.length} ]
    </p>
    <ul class="border-t-2 border-concrete-900">
      {#each items as item (item.id)}
        <li class="flex items-start justify-between gap-4 border-b-2 border-concrete-900 py-4">
          <div class="flex items-start gap-4">
            <img
              src={item.img}
              alt={item.alt}
              class="h-16 w-12 border-2 border-concrete-900 object-cover"
            />
            <div>
              <p class="text-lg font-bold uppercase">{item.name}</p>
              <p class="mt-1 text-[10px] tracking-widest text-signal uppercase">{item.role}</p>
              <p class="mt-2 max-w-lg text-xs leading-relaxed text-concrete-600">{item.bio}</p>
              <p class="mt-2 text-[10px] tracking-widest text-concrete-600">{item.img}</p>
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
          {loaded ? 'NO MEMBERS YET — ADD THE FIRST ONE' : 'LOADING…'}
        </li>
      {/each}
    </ul>
  </div>

  <!-- form -->
  <form onsubmit={save} class="h-fit border-2 border-concrete-900 bg-concrete-50 p-6 shadow-hard lg:col-span-5">
    <p class="text-[10px] tracking-[0.25em] text-concrete-600 uppercase">
      {editingId ? `[ EDITING: ${editingId} ]` : '[ NEW MEMBER ]'}
    </p>

    <label for="tm-name" class="mt-6 block text-[10px] tracking-[0.25em] uppercase">NAME *</label>
    <input
      id="tm-name"
      bind:value={name}
      required
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <label for="tm-role" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">ROLE</label>
    <input
      id="tm-role"
      bind:value={role}
      placeholder="ENGINEER — FRONTEND"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <label for="tm-bio" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">BIO</label>
    <textarea
      id="tm-bio"
      bind:value={bio}
      rows="4"
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"></textarea>

    <label for="tm-img" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">
      PHOTO — UPLOAD (AUTO-WEBP) OR PATH
    </label>
    <div class="mt-2 flex gap-2">
      <input
        id="tm-img"
        bind:value={img}
        placeholder="/team/founder.jpg"
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

    <label for="tm-alt" class="mt-5 block text-[10px] tracking-[0.25em] uppercase">ALT TEXT</label>
    <input
      id="tm-alt"
      bind:value={alt}
      class="mt-2 w-full border-2 border-concrete-900 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
    />

    <div class="mt-8 flex gap-3">
      <button
        type="submit"
        disabled={saving}
        class="cursor-pointer border-2 border-concrete-900 bg-concrete-900 px-5 py-3 text-xs font-bold tracking-[0.2em] text-concrete-50 uppercase shadow-hard-red transition-all hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {editingId ? '[ SAVE CHANGES ]' : '[ ADD MEMBER ]'}
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
