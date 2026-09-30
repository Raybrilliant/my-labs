/**
 * SQLite content database, wired through Drizzle ORM on the `better-sqlite3`
 * driver (synchronous, prebuilt native binding, runs under Node and Bun).
 *
 * The DB file lives at DB_PATH (default: <cwd>/data/raybrilliant.db) so it
 * can sit inside a mounted volume (Docker: /app/data) and survive image
 * rebuilds. On first boot the schema is created and, if the meta table has
 * no `seeded` flag, content is imported once from a legacy
 * data/content.json (the old file-based store) or from the bundled
 * defaults in src/data.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { asc } from 'drizzle-orm';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  projects as seedProjects,
  type OutcomeStat,
  type Project,
  type Swatch,
  type TypefaceEntry,
} from '../data/projects';
import { services as seedServices, type Service } from '../data/services';
import { team as seedTeam, type TeamMember } from '../data/team';
import { clients as seedClients, type Client } from '../data/clients';

export type { OutcomeStat, Project, Service, TeamMember, TypefaceEntry, Client };

export const projectsTable = sqliteTable('projects', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  img: text('img').notNull().default(''),
  alt: text('alt').notNull().default(''),
  year: text('year').notNull().default(''),
  type: text('type').notNull().default(''),
  desc: text('desc').notNull().default(''),
  span: text('span'),
  client: text('client').notNull().default(''),
  liveUrl: text('live_url'),
  briefIntro: text('brief_intro').notNull().default(''),
  brief: text('brief').notNull().default('[]'),
  palette: text('palette').notNull().default('[]'),
  typefaces: text('typefaces').notNull().default('[]'),
  design: text('design').notNull().default('[]'),
  outcome: text('outcome').notNull().default('[]'),
  position: integer('position').notNull().default(0),
});

export const servicesTable = sqliteTable('services', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default(''),
  desc: text('desc').notNull().default(''),
  tags: text('tags').notNull().default('[]'),
  position: integer('position').notNull().default(0),
});

export const teamTable = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default(''),
  bio: text('bio').notNull().default(''),
  img: text('img').notNull().default(''),
  alt: text('alt').notNull().default(''),
  position: integer('position').notNull().default(0),
});

export const clientsTable = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  sector: text('sector').notNull().default(''),
  img: text('img').notNull().default(''),
  alt: text('alt').notNull().default(''),
  position: integer('position').notNull().default(0),
});

type ProjectRow = typeof projectsTable.$inferSelect;
type ServiceRow = typeof servicesTable.$inferSelect;
type TeamRow = typeof teamTable.$inferSelect;
type ClientRow = typeof clientsTable.$inferSelect;

type Db = ReturnType<typeof drizzle>;
let _db: Db | null = null;

export function dbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), 'data', 'raybrilliant.db');
}

/** Lazily open (and initialise) the singleton database connection. */
export function getDb(): Db {
  if (_db) return _db;

  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  // better-sqlite3 creates the file when missing
  const client = new Database(file);
  client.pragma('journal_mode = WAL');
  client.pragma('foreign_keys = ON');

  client.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      img TEXT NOT NULL DEFAULT '',
      alt TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      desc TEXT NOT NULL DEFAULT '',
      span TEXT,
      client TEXT NOT NULL DEFAULT '',
      live_url TEXT,
      brief_intro TEXT NOT NULL DEFAULT '',
      brief TEXT NOT NULL DEFAULT '[]',
      palette TEXT NOT NULL DEFAULT '[]',
      typefaces TEXT NOT NULL DEFAULT '[]',
      design TEXT NOT NULL DEFAULT '[]',
      outcome TEXT NOT NULL DEFAULT '[]',
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      desc TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      img TEXT NOT NULL DEFAULT '',
      alt TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      sector TEXT NOT NULL DEFAULT '',
      img TEXT NOT NULL DEFAULT '',
      alt TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0
    );
  `);

  // drizzle 1.0 RC: positional `drizzle(client)` is broken (it treats the
  // Database instance as a config object and opens a fresh in-memory DB).
  // The { client } config form is the supported path.
  const db = drizzle({ client });
  seedIfNeeded(client, db);
  // Own flag — databases seeded before the clients table existed still
  // get the default roster exactly once.
  seedClientsIfNeeded(client, db);

  _db = db;
  return db;
}

function seedClientsIfNeeded(client: Database.Database, db: Db): void {
  const flag = client.prepare('SELECT value FROM meta WHERE key = ?').get('clients_seeded') as
    | { value: string }
    | null;
  if (flag) return;

  client.exec('BEGIN');
  try {
    for (const [i, c] of structuredClone(seedClients).entries()) {
      db.insert(clientsTable).values(clientToRow(c, i)).onConflictDoNothing().run();
    }
    client
      .prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
      .run('clients_seeded', new Date().toISOString());
    client.exec('COMMIT');
  } catch (err) {
    client.exec('ROLLBACK');
    throw err;
  }
}

function seedIfNeeded(client: Database.Database, db: Db): void {
  const flag = client.prepare('SELECT value FROM meta WHERE key = ?').get('seeded') as
    | { value: string }
    | null;
  if (flag) return;

  const content = readLegacyContent() ?? {
    projects: structuredClone(seedProjects),
    services: structuredClone(seedServices),
    team: structuredClone(seedTeam),
  };

  client.exec('BEGIN');
  try {
    for (const [i, p] of content.projects.entries()) {
      db.insert(projectsTable).values(projectToRow(p, i)).onConflictDoNothing().run();
    }
    for (const [i, s] of content.services.entries()) {
      db.insert(servicesTable).values(serviceToRow(s, i)).onConflictDoNothing().run();
    }
    for (const [i, m] of content.team.entries()) {
      db.insert(teamTable).values(teamToRow(m, i)).onConflictDoNothing().run();
    }
    client
      .prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
      .run('seeded', new Date().toISOString());
    client.exec('COMMIT');
  } catch (err) {
    client.exec('ROLLBACK');
    throw err;
  }
}

/** Legacy JSON store from the previous version — imported once, then ignored. */
function readLegacyContent():
  | { projects: Project[]; services: Service[]; team: TeamMember[] }
  | null {
  const file = path.join(process.cwd(), 'data', 'content.json');
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as {
      projects?: Project[];
      services?: Service[];
      team?: TeamMember[];
    };
    if (!parsed.projects?.length && !parsed.services?.length && !parsed.team?.length) return null;
    return {
      projects: parsed.projects ?? [],
      services: parsed.services ?? [],
      team: parsed.team ?? [],
    };
  } catch {
    return null;
  }
}

// ---------- row <-> entity mappers ----------

function parseArray<T>(raw: string | null | undefined): T[] {
  try {
    const value = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

const json = (value: unknown): string => JSON.stringify(value ?? []);

export function rowToProject(row: ProjectRow): Project {
  return {
    slug: row.slug,
    name: row.name,
    img: row.img,
    alt: row.alt,
    year: row.year,
    type: row.type,
    desc: row.desc,
    span: row.span || undefined,
    client: row.client,
    liveUrl: row.liveUrl || undefined,
    briefIntro: row.briefIntro,
    brief: parseArray(row.brief),
    palette: parseArray<Swatch>(row.palette),
    typefaces: parseArray<TypefaceEntry>(row.typefaces),
    design: parseArray(row.design),
    outcome: parseArray<OutcomeStat>(row.outcome),
  };
}

export function projectToRow(p: Project, position: number): typeof projectsTable.$inferInsert {
  return {
    slug: p.slug,
    name: p.name,
    img: p.img,
    alt: p.alt,
    year: p.year,
    type: p.type,
    desc: p.desc,
    span: p.span ?? null,
    client: p.client,
    liveUrl: p.liveUrl ?? null,
    briefIntro: p.briefIntro,
    brief: json(p.brief),
    palette: json(p.palette),
    typefaces: json(p.typefaces),
    design: json(p.design),
    outcome: json(p.outcome),
    position,
  };
}

export function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    title: row.title,
    desc: row.desc,
    tags: parseArray(row.tags),
  };
}

export function serviceToRow(s: Service, position: number): typeof servicesTable.$inferInsert {
  return { id: s.id, title: s.title, desc: s.desc, tags: json(s.tags), position };
}

export function rowToTeamMember(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    img: row.img,
    alt: row.alt,
  };
}

export function teamToRow(m: TeamMember, position: number): typeof teamTable.$inferInsert {
  return { id: m.id, name: m.name, role: m.role, bio: m.bio, img: m.img, alt: m.alt, position };
}

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    img: row.img,
    alt: row.alt,
  };
}

export function clientToRow(c: Client, position: number): typeof clientsTable.$inferInsert {
  return { id: c.id, name: c.name, sector: c.sector, img: c.img, alt: c.alt, position };
}

// ---------- shared read helpers (used by the store) ----------

export function allProjects(): Project[] {
  const db = getDb();
  return db.select().from(projectsTable).orderBy(asc(projectsTable.position)).all().map(rowToProject);
}

export function allServices(): Service[] {
  const db = getDb();
  return db.select().from(servicesTable).orderBy(asc(servicesTable.position)).all().map(rowToService);
}

export function allTeam(): TeamMember[] {
  const db = getDb();
  return db.select().from(teamTable).orderBy(asc(teamTable.position)).all().map(rowToTeamMember);
}

export function allClients(): Client[] {
  const db = getDb();
  return db.select().from(clientsTable).orderBy(asc(clientsTable.position)).all().map(rowToClient);
}
