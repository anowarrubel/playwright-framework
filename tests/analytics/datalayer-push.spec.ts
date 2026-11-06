import { test, expect } from '../../fixtures/test-fixtures';

/** Data layer pushes caused by a click, for Google (dataLayer) and Adobe (adobeDataLayer), on a local page. */
const DEMO_PAGE = `
  <button id="add">Add to cart</button>
  <button id="promo">Open promo</button>
  <script>
    window.dataLayer = window.dataLayer || [];
    window.adobeDataLayer = window.adobeDataLayer || [];

    document.getElementById('add').addEventListener('click', () => {
      window.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: { currency: 'USD', value: 49.9, items: [{ item_id: 'sku-123' }] },
      });
    });

    document.getElementById('promo').addEventListener('click', () => {
      window.adobeDataLayer.push({ event: 'promo:click', eventInfo: { path: 'page.promo' } });
    });
  </script>`;

test.describe('data layer pushes on user actions (local demo page)', { tag: '@analytics' }, () => {
  test('Google: nothing is pushed until the user clicks', async ({ page, analytics }) => {
    await page.setContent(DEMO_PAGE);
    expect(await analytics.dataLayer()).toEqual([]);
  });

  test('Google: clicking Add to cart pushes an add_to_cart event', async ({ page, analytics }) => {
    await page.setContent(DEMO_PAGE);
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await analytics.expectDataLayerEvent('add_to_cart');
  });

  test('Google: the add_to_cart push carries the right product and value', async ({ page, analytics }) => {
    await page.setContent(DEMO_PAGE);
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await analytics.expectDataLayerEvent('add_to_cart');

    const entry = (await analytics.dataLayer()).find((e) => e.event === 'add_to_cart');
    expect(entry?.ecommerce).toMatchObject({
      currency: 'USD',
      value: 49.9,
      items: [{ item_id: 'sku-123' }],
    });
  });

  test('Adobe: clicking the promo pushes to adobeDataLayer', async ({ page, analytics }) => {
    analytics.useDataLayer('adobeDataLayer');
    await page.setContent(DEMO_PAGE);
    await page.getByRole('button', { name: 'Open promo' }).click();
    await analytics.expectDataLayerEntry({ event: 'promo:click', eventInfo: { path: 'page.promo' } });
  });
});
