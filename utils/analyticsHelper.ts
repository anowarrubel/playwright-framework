import { Page, expect } from '@playwright/test';
import { ANALYTICS_VENDORS, AnalyticsVendorId } from '../config/analytics-vendors';

export type DataLayerEntry = Record<string, unknown>;

/**
 * Watches a page's network traffic and data layer. Create it BEFORE you
 * navigate (the `analytics` fixture does this for you), because it can only
 * see requests made after it starts listening.
 *
 * Google Analytics / Tag Manager push to `window.dataLayer`, which is the
 * default. Adobe's Client Data Layer uses `window.adobeDataLayer`; switch with
 * `analytics.useDataLayer('adobeDataLayer')`.
 */
export class AnalyticsTracker {
  private readonly urls: string[] = [];
  private layerName = 'dataLayer';

  constructor(private readonly page: Page) {
    page.on('request', (request) => this.urls.push(request.url()));
  }

  /** Read a different data layer, e.g. 'adobeDataLayer'. Returns this for chaining. */
  useDataLayer(name: string): this {
    this.layerName = name;
    return this;
  }

  /** Current data layer contents (empty array if the page has none). */
  async dataLayer(): Promise<DataLayerEntry[]> {
    return this.page.evaluate((name) => {
      const layer = (window as unknown as Record<string, unknown>)[name];
      return Array.isArray(layer) ? layer.map((entry) => ({ ...(entry as object) })) : [];
    }, this.layerName);
  }

  /** The vendor made its tracking request (retries until `timeout`). */
  async expectVendor(id: AnalyticsVendorId, timeout = 15_000): Promise<void> {
    const vendor = ANALYTICS_VENDORS[id];
    await expect
      .poll(() => this.urls.some((url) => vendor.request.test(url)), {
        message: `expected a ${vendor.label} request matching ${vendor.request}`,
        timeout,
      })
      .toBe(true);
  }

  /** No known analytics or tracking vendor made a request, even after a short wait for late ones. */
  async expectNoTracking(settleMs = 3_000): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    const seen = Object.values(ANALYTICS_VENDORS)
      .filter((vendor) => this.urls.some((url) => vendor.request.test(url)))
      .map((vendor) => vendor.label);
    expect(seen, 'unexpected analytics/tracking requests').toEqual([]);
  }

  async expectDataLayerNotEmpty(timeout = 15_000): Promise<void> {
    await expect
      .poll(async () => (await this.dataLayer()).length, {
        message: `expected window.${this.layerName} to exist and contain entries`,
        timeout,
      })
      .toBeGreaterThan(0);
  }

  /**
   * The data layer received an entry containing every key/value in `match`.
   * Extra keys on the entry are fine, so you only assert what matters:
   *
   *   await analytics.expectDataLayerEntry({ event: 'purchase', value: 49.9 });
   */
  async expectDataLayerEntry(match: DataLayerEntry, timeout = 15_000): Promise<void> {
    const matches = (entry: DataLayerEntry) =>
      Object.entries(match).every(([key, value]) => JSON.stringify(entry[key]) === JSON.stringify(value));

    await expect
      .poll(async () => (await this.dataLayer()).some(matches), {
        message: `expected a ${this.layerName} entry matching ${JSON.stringify(match)}`,
        timeout,
      })
      .toBe(true);
  }

  /** Shorthand for an entry with `event: name`. */
  async expectDataLayerEvent(name: string, timeout = 15_000): Promise<void> {
    await this.expectDataLayerEntry({ event: name }, timeout);
  }
}
