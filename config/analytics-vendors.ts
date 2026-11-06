/** Analytics vendors we can detect, keyed by the id used in `sites.ts`; `request` matches their network call. */
export const ANALYTICS_VENDORS = {
  gtm: {
    label: 'Google Tag Manager',
    request: /googletagmanager\.com\/gtm\.js/,
  },
  ga4: {
    label: 'Google Analytics 4',
    request: /(google-analytics|analytics\.google)\.com\/g\/collect/,
  },
  ua: {
    label: 'Universal Analytics',
    request: /google-analytics\.com\/(j\/)?collect/,
  },
  adobe: {
    label: 'Adobe Analytics',
    request: /\.omtrdc\.net|\/b\/ss\/|demdex\.net/,
  },
  meta: {
    label: 'Meta Pixel',
    request: /facebook\.com\/tr\/?\?/,
  },
} as const;

export type AnalyticsVendorId = keyof typeof ANALYTICS_VENDORS;
