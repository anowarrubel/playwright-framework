import { Browser } from '@playwright/test';

/** Core Web Vitals plus two supporting numbers, for one page load. */
export interface WebVitals {
  /** Time to first byte, ms. */
  ttfb: number;
  /** First contentful paint, ms (null if the browser never reported one). */
  fcp: number | null;
  /** Largest contentful paint, ms (null if none was reported). */
  lcp: number | null;
  /** Cumulative layout shift, unitless. */
  cls: number;
  /** Number of network requests the page made. */
  requests: number;
}

export interface PerfBudget {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  requests: number;
}

/** Google's "good" thresholds for the Web Vitals, plus a request-count cap. */
export const DEFAULT_BUDGET: PerfBudget = {
  ttfb: 800,
  fcp: 1800,
  lcp: 2500,
  cls: 0.1,
  requests: 150,
};

interface PerfWindow {
  __vitals: { lcp: number | null; cls: number };
}

async function measureOnce(browser: Browser, url: string): Promise<WebVitals> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    let requests = 0;
    page.on('request', () => requests++);

    // Runs before any page script, so no early paint or shift is missed.
    await page.addInitScript(() => {
      const w = window as unknown as PerfWindow;
      w.__vitals = { lcp: null, cls: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__vitals.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) w.__vitals.cls += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto(url, { waitUntil: 'load' });

    // LCP is reported shortly after load; wait for it rather than sleeping.
    await page
      .waitForFunction(() => (window as unknown as PerfWindow).__vitals.lcp !== null, undefined, {
        timeout: 5_000,
      })
      .catch(() => undefined);

    const vitals = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const w = window as unknown as PerfWindow;
      return {
        ttfb: nav.responseStart,
        fcp: fcp ? fcp.startTime : null,
        lcp: w.__vitals.lcp,
        cls: w.__vitals.cls,
      };
    });
    return { ...vitals, requests };
  } finally {
    await context.close();
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Loads the page several times in fresh browser contexts and returns the
 * median of each metric, which smooths out one-off network noise.
 */
export async function measureWebVitals(browser: Browser, url: string, runs = 3): Promise<WebVitals> {
  const samples: WebVitals[] = [];
  for (let i = 0; i < runs; i++) samples.push(await measureOnce(browser, url));

  const pick = (get: (v: WebVitals) => number | null): number | null => {
    const values = samples.map(get).filter((v): v is number => v !== null);
    return values.length ? median(values) : null;
  };

  return {
    ttfb: pick((v) => v.ttfb) ?? 0,
    fcp: pick((v) => v.fcp),
    lcp: pick((v) => v.lcp),
    cls: pick((v) => v.cls) ?? 0,
    requests: pick((v) => v.requests) ?? 0,
  };
}

export interface PerfCheck {
  id: string;
  title: string;
  run: (v: WebVitals, budget: PerfBudget) => { passed: boolean; detail: string };
}

const ms = (value: number | null) => (value === null ? 'not reported' : `${Math.round(value)} ms`);

export const PERF_CHECKS: PerfCheck[] = [
  {
    id: 'ttfb',
    title: 'Server responds quickly (time to first byte)',
    run: (v, b) => ({ passed: v.ttfb <= b.ttfb, detail: `${ms(v.ttfb)} (budget ${b.ttfb} ms)` }),
  },
  {
    id: 'fcp',
    title: 'Content starts painting quickly (first contentful paint)',
    run: (v, b) => ({
      passed: v.fcp !== null && v.fcp <= b.fcp,
      detail: `${ms(v.fcp)} (budget ${b.fcp} ms)`,
    }),
  },
  {
    id: 'lcp',
    title: 'Main content is visible quickly (largest contentful paint)',
    run: (v, b) => ({
      passed: v.lcp !== null && v.lcp <= b.lcp,
      detail: `${ms(v.lcp)} (budget ${b.lcp} ms)`,
    }),
  },
  {
    id: 'cls',
    title: 'Layout is stable while loading (cumulative layout shift)',
    run: (v, b) => ({ passed: v.cls <= b.cls, detail: `${v.cls.toFixed(3)} (budget ${b.cls})` }),
  },
  {
    id: 'requests',
    title: 'Page makes a reasonable number of requests',
    run: (v, b) => ({ passed: v.requests <= b.requests, detail: `${v.requests} (budget ${b.requests})` }),
  },
];
