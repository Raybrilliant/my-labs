/**
 * Clients — single source of truth for the 04 / CLIENTS wall.
 * Seeded into SQLite on first boot (own meta flag, so databases that
 * were seeded before this table existed still get the defaults);
 * managed at /admin/clients afterwards.
 */

export interface Client {
  id: string;
  name: string;
  sector: string;
  /** Logo path (/uploads/<name>.webp or /public path). Empty = text-only cell. */
  img: string;
  alt: string;
}

export const clients: Client[] = [
  { id: 'arunika-coffee', name: 'ARUNIKA COFFEE', sector: 'F&B / E-COMMERCE', img: '', alt: '' },
  { id: 'nusa-pay', name: 'NUSA PAY', sector: 'FINTECH / MVP', img: '', alt: '' },
  { id: 'gerak-inisiatif', name: 'GERAK INISIATIF', sector: 'NGO / CAMPAIGN SITE', img: '', alt: '' },
  { id: 'batik-archipelago', name: 'BATIK ARCHIPELAGO', sector: 'RETAIL / STOREFRONT', img: '', alt: '' },
  { id: 'santai-supply', name: 'SANTAI SUPPLY CO.', sector: 'D2C / WEB APP', img: '', alt: '' },
  { id: 'koordinasi-id', name: 'KOORDINASI.ID', sector: 'SAAS / DASHBOARD', img: '', alt: '' },
  { id: 'tani-maju', name: 'TANI MAJU', sector: 'AGRITECH / MOBILE APP', img: '', alt: '' },
];
