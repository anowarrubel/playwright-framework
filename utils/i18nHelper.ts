import { Page, Response } from '@playwright/test';

/** Locale-related facts read from one loaded page. */
export interface I18nSnapshot {
  lang: string | null;
  dir: string | null;
  charset: string | null;
  contentType: string;
  hreflangs: { lang: string; href: string }[];
  /** Count of U+FFFD, the "replacement character" shown when text is decoded wrongly. */
  brokenCharacters: number;
}

export interface I18nCheck {
  id: string;
  title: string;
  run: (s: I18nSnapshot) => { passed: boolean; detail: string };
}

export async function collectI18n(page: Page, response: Response | null): Promise<I18nSnapshot> {
  const dom = await page.evaluate(() => ({
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir'),
    charset:
      document.querySelector('meta[charset]')?.getAttribute('charset') ??
      /charset=([\w-]+)/i.exec(
        document.querySelector('meta[http-equiv="Content-Type" i]')?.getAttribute('content') ?? '',
      )?.[1] ??
      null,
    hreflangs: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((el) => ({
      lang: el.getAttribute('hreflang') ?? '',
      href: (el as HTMLLinkElement).href,
    })),
    brokenCharacters: (document.body?.innerText.match(/�/g) ?? []).length,
  }));
  return { ...dom, contentType: (await response?.headerValue('content-type')) ?? '' };
}

/** A language tag such as "en", "en-US" or "zh-Hant-TW". */
export const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export const I18N_CHECKS: I18nCheck[] = [
  {
    id: 'lang-valid',
    title: '<html lang> is a valid language tag',
    run: (s) => ({
      passed: s.lang !== null && LANGUAGE_TAG.test(s.lang),
      detail: s.lang === null ? 'lang attribute missing' : `lang="${s.lang}"`,
    }),
  },
  {
    id: 'charset-utf8',
    title: 'Page declares UTF-8 encoding',
    run: (s) => {
      const declared = (s.charset ?? /charset=([\w-]+)/i.exec(s.contentType)?.[1] ?? '').toLowerCase();
      return { passed: declared === 'utf-8', detail: declared ? `charset=${declared}` : 'no charset declared' };
    },
  },
  {
    id: 'hreflang-valid',
    title: 'hreflang alternates (if any) are well formed',
    run: (s) => {
      const bad = s.hreflangs.filter(
        (h) => !(h.lang === 'x-default' || LANGUAGE_TAG.test(h.lang)) || !/^https?:\/\//.test(h.href),
      );
      return {
        passed: bad.length === 0,
        detail: s.hreflangs.length ? `${s.hreflangs.length} declared, ${bad.length} malformed` : 'none declared',
      };
    },
  },
  {
    id: 'no-broken-characters',
    title: 'No garbled characters in the page text',
    run: (s) => ({ passed: s.brokenCharacters === 0, detail: `${s.brokenCharacters} replacement characters` }),
  },
];

/** Locales the page is loaded under to prove it copes with other languages. */
export const PROBE_LOCALES = [
  { code: 'de-DE', note: 'long words, comma decimals' },
  { code: 'ja-JP', note: 'non-Latin script' },
  { code: 'ar-SA', note: 'right-to-left' },
];
