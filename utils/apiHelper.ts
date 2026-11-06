import { APIRequestContext, expect } from '@playwright/test';
import { ApiEndpoint } from '../config/sites';

/** Calls one endpoint and asserts status, content type, speed and JSON shape. */
export async function expectEndpoint(
  request: APIRequestContext,
  baseUrl: string,
  endpoint: ApiEndpoint,
  maxResponseMs: number,
): Promise<void> {
  const started = Date.now();
  const response = await request.fetch(`${baseUrl}${endpoint.path}`, {
    method: endpoint.method ?? 'GET',
    failOnStatusCode: false,
  });
  const elapsed = Date.now() - started;

  expect(response.status(), 'HTTP status').toBe(endpoint.status);
  expect(response.headers()['content-type'] ?? '', 'content type').toContain('application/json');
  expect(elapsed, `took ${elapsed} ms`).toBeLessThan(maxResponseMs);

  const body = await response.json();

  for (const key of endpoint.keys ?? []) {
    expect(body, `response has "${key}"`).toHaveProperty(key);
  }

  if (endpoint.list) {
    const { arrayAt, itemKeys, minItems = 1 } = endpoint.list;
    const items = arrayAt ? body[arrayAt] : body;
    expect(Array.isArray(items), `${arrayAt || 'response'} is a list`).toBe(true);
    expect(items.length, 'number of items').toBeGreaterThanOrEqual(minItems);
    for (const item of items) {
      for (const key of itemKeys) expect(item, `item has "${key}"`).toHaveProperty(key);
    }
  }
}
