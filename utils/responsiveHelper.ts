import { Page } from '@playwright/test';

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORTS: Viewport[] = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
];

/** Layout facts read from the page at one viewport size. */
export interface LayoutSnapshot {
  viewportWidth: number;
  scrollWidth: number;
  hasViewportMeta: boolean;
  /** Images (or other media) wider than the viewport. */
  overflowingImages: string[];
  baseFontSizePx: number;
}

export async function collectLayout(page: Page): Promise<LayoutSnapshot> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflowingImages = Array.from(document.querySelectorAll('img, video, iframe'))
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > viewportWidth + 1 && getComputedStyle(el).display !== 'none';
      })
      .map((el) => el.getAttribute('src') ?? el.tagName.toLowerCase());
    return {
      viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
      overflowingImages,
      baseFontSizePx: parseFloat(getComputedStyle(document.body).fontSize),
    };
  });
}

export interface LayoutCheck {
  id: string;
  title: string;
  run: (s: LayoutSnapshot) => { passed: boolean; detail: string };
}

export const LAYOUT_CHECKS: LayoutCheck[] = [
  {
    id: 'viewport-meta',
    title: 'Page has a viewport meta tag',
    run: (s) => ({ passed: s.hasViewportMeta, detail: s.hasViewportMeta ? 'present' : 'missing' }),
  },
  {
    id: 'no-horizontal-scroll',
    title: 'Page does not scroll sideways',
    run: (s) => ({
      passed: s.scrollWidth <= s.viewportWidth + 1,
      detail: `content is ${s.scrollWidth}px wide in a ${s.viewportWidth}px viewport`,
    }),
  },
  {
    id: 'media-fits',
    title: 'Images and media fit inside the viewport',
    run: (s) => ({
      passed: s.overflowingImages.length === 0,
      detail: s.overflowingImages.length
        ? `${s.overflowingImages.length} too wide, e.g. ${s.overflowingImages[0]}`
        : 'all fit',
    }),
  },
  {
    id: 'readable-text',
    title: 'Body text is at least 14px',
    run: (s) => ({ passed: s.baseFontSizePx >= 14, detail: `${s.baseFontSizePx}px` }),
  },
];
