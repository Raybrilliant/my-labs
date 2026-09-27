## Development

**Runtime:** plain **Node >= 22.12** — the content store uses `better-sqlite3`
(see `src/utils/db.ts`), a prebuilt native binding that works under Node and
Bun alike. Standard scripts, no runtime flags needed:

```
npm run dev      # foreground dev server (or: bun run dev)
npm run build    # -> dist/client + dist/server
npm run start    # node ./dist/server/entry.mjs
```

Bun can still be used as the package manager (`bun install`, `bun.lock`) —
only the `bun:*` runtime APIs are gone. `package-lock.json` is kept in sync
for the Docker build (`npm ci`).

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
