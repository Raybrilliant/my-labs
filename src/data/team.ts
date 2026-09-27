/**
 * Team members — single source of truth.
 * Seeded into data/content.json by the server store; managed at
 * /admin/team afterwards. Images live in /public/team/.
 */

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Path under /public, e.g. /team/founder.jpg */
  img: string;
  alt: string;
}

export const team: TeamMember[] = [
  {
    id: 'raihan-f-brilliansyach',
    name: 'RAIHAN F. BRILLIANSYACH',
    role: 'FOUNDER — ENGINEERING / EVERYTHING ELSE',
    bio: 'Started the lab after one too many projects where the deck looked better than the product. Writes the code, breaks the grid, answers your emails personally.',
    img: '/team/founder.jpg',
    alt: 'Abstract placeholder portrait of the founder — geometric figure in concrete, black and signal red',
  },
];
