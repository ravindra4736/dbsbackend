import { BadRequestException } from '@nestjs/common';

/**
 * Reserved first-path segments that must never be used as page slugs.
 * Keep aligned with app routes that would collide with a future public /[slug].
 */
export const RESERVED_PAGE_SLUGS = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'unauthorized',
  'forbidden',
  'auth',
  'media',
  'settings',
  'dashboard',
  'health',
  'activity-logs',
  'users',
  'roles',
  'permissions',
  'cms',
  'pages',
  'new',
  'edit',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

/**
 * Normalize a slug candidate: lowercase, hyphenated, alphanumeric only.
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function slugFromTitle(title: string): string {
  return normalizeSlug(title);
}

export function assertValidSlug(slug: string): string {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    throw new BadRequestException('Slug is invalid or empty.');
  }
  if (RESERVED_PAGE_SLUGS.has(normalized)) {
    throw new BadRequestException(`Slug "${normalized}" is reserved.`);
  }
  return normalized;
}

export function deletedSlug(originalSlug: string, id: string): string {
  return `${originalSlug}__deleted__${id}`;
}
