import type { Page } from '@playwright/test';
import routes from './routes.json' with { type: 'json' };

export interface AppRoute {
  path: string;
  name: string;
  tags: string[];
}

export const appRoutes: AppRoute[] = routes;

export const SENTINELS = ['ZQX_ENERGIA_7F3', 'ZQX_SONO_9K2', 'ZQX_FOCO_4M8', 'ZQX_OBS_NOTA_5T1'];

// Visible text of the page, ignoring elements that show real names on purpose ([data-privacy-allow]).
export function visibleTextOutsideAllowList(page: Page): Promise<string> {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-privacy-allow], script, style').forEach((el) => el.remove());
    return clone.textContent ?? '';
  });
}

export function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
