/**
 * Server-side content store. All editable site content lives in the
 * SQLite database (see ./db — Bun native sqlite via Drizzle ORM), which
 * seeds itself once from the bundled defaults in src/data.
 *
 * Admin edits via /api/admin/* rewrite the rows; SSR pages read them
 * per request. Public API is unchanged from the previous JSON-file store.
 */
import { getDb, projectsTable, servicesTable, teamTable, clientsTable, allProjects, allServices, allTeam, allClients, projectToRow, serviceToRow, teamToRow, clientToRow, type Project, type Service, type TeamMember, type Client } from './db';

export type { Project, Service, TeamMember, Client } from './db';
export type { Swatch, TypefaceEntry, OutcomeStat } from '../data/projects';

export interface SiteContent {
  projects: Project[];
  services: Service[];
  team: TeamMember[];
  clients: Client[];
}

export async function readContent(): Promise<SiteContent> {
  return {
    projects: allProjects(),
    services: allServices(),
    team: allTeam(),
    clients: allClients(),
  };
}

/**
 * Full-collection replace in one transaction — matches how the admin
 * APIs mutate (edit-in-place, push, filter) before saving the whole set.
 */
export async function writeContent(content: SiteContent): Promise<void> {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(projectsTable).run();
    tx.delete(servicesTable).run();
    tx.delete(teamTable).run();
    tx.delete(clientsTable).run();
    content.projects.forEach((p, i) => tx.insert(projectsTable).values(projectToRow(p, i)).run());
    content.services.forEach((s, i) => tx.insert(servicesTable).values(serviceToRow(s, i)).run());
    content.team.forEach((m, i) => tx.insert(teamTable).values(teamToRow(m, i)).run());
    content.clients.forEach((c, i) => tx.insert(clientsTable).values(clientToRow(c, i)).run());
  });
}

/** Read the admin token — runtime env first (Docker), build-time .env as fallback. */
export function adminToken(): string | undefined {
  return process.env.ADMIN_TOKEN || import.meta.env.ADMIN_TOKEN || undefined;
}

/** Loose string field normalisation for admin payloads. */
export function asString(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function asStringArray(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
