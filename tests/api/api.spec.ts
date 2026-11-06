import { test } from '@playwright/test';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectEndpoint } from '../../utils/apiHelper';

/** Endpoint contract checks from each site's `api` block; no browser involved. */
const env = getCurrentEnv();
const DEFAULT_MAX_MS = 3_000;

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  if (!site.api) continue;
  const api = site.api;
  const baseUrl = `${getBaseUrl(siteId, env).replace(/\/$/, '')}${api.basePath ?? ''}`;

  test.describe(`api :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    for (const endpoint of api.endpoints) {
      test(endpoint.title, async ({ request }) => {
        await expectEndpoint(request, baseUrl, endpoint, api.maxResponseMs ?? DEFAULT_MAX_MS);
      });
    }
  });
}
