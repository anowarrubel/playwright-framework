import { test, expect } from '../../fixtures/test-fixtures';
import { Browser, Page } from '@playwright/test';

/** Locale formatting and right-to-left checks, run against a local page. */
const DEMO_PAGE = `
  <html>
    <body>
      <p id="price"></p>
      <p id="date"></p>
      <script>
        const locale = navigator.language;
        const rtl = new Intl.Locale(locale).language === 'ar';
        document.documentElement.lang = locale;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        document.getElementById('price').textContent =
          new Intl.NumberFormat(locale, { style: 'currency', currency: locale === 'en-US' ? 'USD' : 'EUR' }).format(1234.56);
        document.getElementById('date').textContent =
          new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2025-03-09T12:00:00Z'));
      </script>
    </body>
  </html>`;

async function openAs(browser: Browser, locale: string): Promise<Page> {
  const context = await browser.newContext({ locale });
  const page = await context.newPage();
  await page.setContent(DEMO_PAGE);
  return page;
}

test.describe('locale formatting (local demo page)', { tag: '@framework-demo' }, () => {
  const cases = [
    { locale: 'en-US', price: '$1,234.56', date: 'March 9, 2025', dir: 'ltr' },
    { locale: 'de-DE', price: /1\.234,56\s€/, date: '9. März 2025', dir: 'ltr' },
    { locale: 'fr-FR', price: /1\s234,56\s€/, date: '9 mars 2025', dir: 'ltr' },
  ];

  for (const c of cases) {
    test(`${c.locale}: price and date use local conventions`, async ({ browser }) => {
      const page = await openAs(browser, c.locale);
      await expect(page.locator('#price')).toHaveText(c.price);
      await expect(page.locator('#date')).toHaveText(c.date);
      await expect(page.locator('html')).toHaveAttribute('dir', c.dir);
      await page.context().close();
    });
  }

  test('ar-SA: page switches to right-to-left', async ({ browser }) => {
    const page = await openAs(browser, 'ar-SA');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.context().close();
  });
});
