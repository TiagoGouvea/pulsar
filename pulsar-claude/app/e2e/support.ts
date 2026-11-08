import type { Page } from '@playwright/test';
import { SENTINELS as SEED_SENTINELS } from '../scripts/seed-data';
import { PRIVACY_ALLOW_ATTRIBUTE } from '../src/privacy/allow';
import routes from './routes.json' with { type: 'json' };

export interface AppRoute {
  path: string;
  name: string;
  tags: string[];
}

export const appRoutes: AppRoute[] = routes;

/**
 * Names planted in the seed dataset. They come from the seed itself (single source of truth), so
 * the privacy guard can never check a sentinel the seed does not use.
 */
export const SENTINELS: string[] = [
  SEED_SENTINELS.energy,
  SEED_SENTINELS.sleep,
  SEED_SENTINELS.focus,
  SEED_SENTINELS.note,
];

/** Elements that show real indicator names on purpose (explicit editing, opened observation). */
export const PRIVACY_ALLOW_SELECTOR = `[${PRIVACY_ALLOW_ATTRIBUTE}]`;

// Visible text of the page, ignoring elements that show real names on purpose ([data-privacy-allow]).
export function visibleTextOutsideAllowList(page: Page): Promise<string> {
  return page.evaluate((allowSelector) => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(`${allowSelector}, script, style`).forEach((el) => el.remove());
    return clone.textContent ?? '';
  }, PRIVACY_ALLOW_SELECTOR);
}

export function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
