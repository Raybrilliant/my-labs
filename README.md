# Raybrilliant Labs — Portfolio

Brutalist portfolio site for Raybrilliant Labs. Astro + Svelte 5 + Tailwind v4 + GSAP + Three.js, with a Telegram-bot contact endpoint.

## Development

```sh
bun install      # atau: npm install
npm run dev      # dev server (jalan di Node murni)
```

Dev server: http://localhost:4321

## Contact form → Telegram

1. Chat [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → copy the token.
2. Message your new bot once, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` → copy `result[0].message.chat.id`.
3. Fill both values in `.env` (see `.env.example`).

> **Runtime env:** endpoint ini baca `import.meta.env` dulu (dev/build), lalu
> fallback ke `process.env` — jadi di Docker, `TELEGRAM_BOT_TOKEN` &
> `TELEGRAM_CHAT_ID` cukup di-inject saat runtime (compose `environment`), tanpa
> bake secret ke dalam image.

## Admin / Content Management

Halaman manajemen konten (projects, services, team) ada di bawah `/admin`:

| Halaman | Fungsi |
| --- | --- |
| `/admin` | Dashboard (jumlah konten) |
| `/admin/projects` | CRUD project: kartu di homepage + halaman case study `/projects/[slug]` |
| `/admin/services` | CRUD daftar services (section 02) |
| `/admin/team` | CRUD anggota tim (section 05 / The Lab) |

- Login pakai `ADMIN_TOKEN` dari `.env` (cookie HttpOnly, 7 hari). **Wajib ganti
  nilainya** sebelum deploy.
- Semua konten tersimpan di **SQLite** (`data/raybrilliant.db`) via Drizzle ORM
  (`src/utils/db.ts`, driver `better-sqlite3`) — homepage & halaman project
  dirender SSR per request, jadi **tanpa rebuild**.
- Database dibuat otomatis saat pertama jalan: kalau ada legacy
  `data/content.json` dari versi lama, isinya diimpor sekali; kalau tidak, seed
  dari `src/data/*`. Hapus `data/raybrilliant.db` untuk reset ke konten bawaan.
- **Upload foto:** tombol `UPLOAD` di form projects & team menerima JPEG/PNG/WEBP
  (maks 10MB, divalidasi via magic bytes), kompres otomatis ke **WEBP** (maks
  1600px, q80) pakai `sharp`, lalu disimpan ke `data/uploads/` dan disajikan dari
  `/uploads/<nama>.webp`. Nama file di-hash dari isinya — aman di-cache immutable.
- Kolom `LIVE URL` di project bersifat opsional — kalau diisi, tombol
  `[ VISIT LIVE SITE ↗ ]` muncul di halaman case study; kalau kosong, tidak
  dirender.
- Runtime **Node >= 22.12** — store pakai `better-sqlite3` (prebuilt binding,
  jalan di Node; Bun tetap bisa dipakai sebagai package manager).

## Production build & deploy (Docker)

Runtime image pakai **Bun 1.4.2** (`oven/bun:1.4.2`) — versi dipin juga lewat
`.bun-version`. Store tetap pakai `better-sqlite3`: N-API binding-nya jalan
identik di bawah Bun, jadi lokal bisa pakai Node, container pakai Bun.
Build output tetap `@astrojs/node` standalone:

```sh
npm run build     # -> dist/client (static assets) + dist/server (server entry)
```

### Deploy via Docker Compose (recommended)

1. Siapkan `.env` di server (copy dari `.env.example`): `ADMIN_TOKEN` (wajib),
   `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, opsional `DOCKERHUB_USER`.
2. Build & jalankan:
   ```sh
   docker compose up -d --build
   ```
3. Push image ke Docker Hub (opsional, untuk deploy di mesin lain):
   ```sh
   docker compose build
   docker compose push
   # di server: docker compose pull && docker compose up -d
   ```

**Persistensi data:** `docker-compose.yml` memount named volume
`raybrilliant-data` ke `/app/data` — di situlah `raybrilliant.db` (konten admin)
dan `uploads/` (foto) disimpan. Image di-rebuild/redeploy sekalipun, data tetap
aman. Backup tinggal:

```sh
docker run --rm -v raybrilliant-labs_raybrilliant-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/data-backup.tar.gz -C /data .
```

> Catatan nama volume mengikuti nama folder project — cek dengan
> `docker volume ls`.

### CI/CD via GitHub Actions → Docker Hub

`.github/workflows/docker.yml` otomatis build & push image ke Docker Hub:

- **Push ke `main`** → build + push tag `:latest` dan `:sha-<short>`
- **Push tag `v*`** (mis. `v1.2.0`) → build + push tag versi (`:1.2.0`, `:1.2`, `:latest`, `:sha-...`)
- **Pull request ke `main`** → build doang (validasi), nggak push
- Cache layer pakai GitHub Actions cache (`type=gha`), jadi build ulang cepat

Setup sekali di GitHub repo → **Settings → Secrets and variables → Actions**:

1. Secret `DOCKERHUB_USERNAME` = username Docker Hub kamu
2. Secret `DOCKERHUB_TOKEN` = access token dari Docker Hub
   (Account Settings → Security → New Access Token, permission **Read & Write**)

Setelah itu deploy di server tinggal pull image dari hub:

```sh
docker pull <username>/raybrilliant-labs:latest
docker compose pull && docker compose up -d   # kalau pakai compose
```

### Deploy manual (tanpa compose)

```sh
docker build -t raybrilliant-labs .
docker run -d --name raybrilliant-labs \
  -p 4321:4321 \
  -v raybrilliant-data:/app/data \
  -e ADMIN_TOKEN=ganti-ini \
  -e TELEGRAM_BOT_TOKEN=... \
  -e TELEGRAM_CHAT_ID=... \
  --restart unless-stopped \
  raybrilliant-labs
```

### Tanpa Docker (VPS + Node langsung)

Butuh **Node >= 22.12** (cek: `node --version`):

```sh
npm install     # atau: bun install
npm run build
ADMIN_TOKEN=... TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... DB_PATH=/var/lib/raybrilliant/raybrilliant.db \
  node ./dist/server/entry.mjs   # pakai pm2/systemd
```

5. Reverse-proxy dengan Nginx/Caddy ke port yang dipakai (`PORT`, default `4321`).

## Struktur

```
src/
├── components/
│   ├── astro/     # section statis: Nav, Projects, Team, Contact, Footer, Marquee...
│   └── svelte/    # islands interaktif: Hero, HeroCanvas, Services, Process, ContactForm, CustomCursor
│       └── admin/ # islands CRUD: AdminProjects, AdminServices, AdminTeam
├── data/          # seed konten: projects.ts, services.ts, team.ts
├── layouts/       # BaseLayout (fonts, grain, cursor, reveal script) + AdminLayout
├── pages/
│   ├── index.astro            # SSR — membaca content store
│   ├── projects/[slug].astro  # SSR — halaman case study per project
│   ├── admin/                 # SSR — login, dashboard, manajemen konten
│   ├── uploads/[...file].ts   # SSR — sajikan foto dari data/uploads
│   └── api/
│       ├── contact.ts         # SSR -> Telegram bot
│       └── admin/             # SSR — login/logout + CRUD + upload (sharp→WEBP)
├── scripts/       # reveal.ts (global scroll animations)
├── styles/        # global.css (Tailwind v4 @theme + brutalist components)
├── utils/         # gsap.ts + store.ts + db.ts (Drizzle ORM / better-sqlite3)
└── middleware.ts  # gate /admin & /api/admin via ADMIN_TOKEN cookie
```

## Isi placeholder

Projects & seed data (di `src/data/`), founder (seed `team.ts`), social links
(di `Footer.astro`), dan email/Telegram (di `ContactForm.svelte`) semuanya
placeholder — tinggal swap dengan konten asli. Thumbnail ada di `public/projects/`
sebagai SVG, ganti dengan screenshot asli saat siap. Semua konten projects /
services / team juga bisa diubah langsung dari `/admin` tanpa sentuh kode.
