import tls from 'node:tls';
import { APIRequestContext } from '@playwright/test';

/** Everything the security checks need, fetched once per site. */
export interface SecurityContext {
  baseUrl: string;
  isHttps: boolean;
  headers: Record<string, string>;
  setCookies: string[];
  /** true/false once tested; null when the site isn't served over https. */
  httpRedirectsToHttps: boolean | null;
  /** Days until the TLS certificate expires, or an error message. */
  tls: { daysUntilExpiry: number } | { error: string } | null;
}

export interface SecurityCheck {
  id: string;
  title: string;
  run: (ctx: SecurityContext) => { passed: boolean; detail: string };
}

export async function gatherSecurityContext(
  request: APIRequestContext,
  baseUrl: string,
): Promise<SecurityContext> {
  const url = new URL(baseUrl);
  const isHttps = url.protocol === 'https:';

  const response = await request.get(baseUrl, { failOnStatusCode: false });
  const headers = response.headers();
  const setCookies = response
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value);

  let httpRedirectsToHttps: boolean | null = null;
  if (isHttps) {
    const plain = await request
      .get(`http://${url.host}${url.pathname}`, { failOnStatusCode: false, timeout: 15_000 })
      .catch(() => null);
    httpRedirectsToHttps = plain ? new URL(plain.url()).protocol === 'https:' : false;
  }

  return {
    baseUrl,
    isHttps,
    headers,
    setCookies,
    httpRedirectsToHttps,
    tls: isHttps ? await checkTlsCertificate(url.hostname) : null,
  };
}

function checkTlsCertificate(
  hostname: string,
): Promise<{ daysUntilExpiry: number } | { error: string }> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 10_000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) {
        resolve({ error: 'no certificate returned' });
        return;
      }
      const msLeft = new Date(cert.valid_to).getTime() - Date.now();
      resolve({ daysUntilExpiry: Math.floor(msLeft / 86_400_000) });
    });
    socket.on('error', (err) => resolve({ error: err.message }));
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ error: 'TLS connection timed out' });
    });
  });
}

const HSTS_MIN_SECONDS = 15_552_000; // ~180 days

export const SECURITY_CHECKS: SecurityCheck[] = [
  {
    id: 'https-redirect',
    title: 'Plain http:// redirects to https://',
    run: (ctx) => {
      if (!ctx.isHttps) return { passed: false, detail: 'base URL is not https' };
      return {
        passed: ctx.httpRedirectsToHttps === true,
        detail: ctx.httpRedirectsToHttps ? 'http redirects to https' : 'http does not redirect to https',
      };
    },
  },
  {
    id: 'strict-transport-security',
    title: 'Strict-Transport-Security (HSTS) is set with a long max-age',
    run: (ctx) => {
      const value = ctx.headers['strict-transport-security'];
      if (!value) return { passed: false, detail: 'header missing' };
      const maxAge = Number(/max-age=(\d+)/i.exec(value)?.[1] ?? 0);
      return { passed: maxAge >= HSTS_MIN_SECONDS, detail: `max-age=${maxAge} (${value})` };
    },
  },
  {
    id: 'x-content-type-options',
    title: 'X-Content-Type-Options is nosniff',
    run: (ctx) => {
      const value = ctx.headers['x-content-type-options'];
      return { passed: value?.toLowerCase() === 'nosniff', detail: value ?? 'header missing' };
    },
  },
  {
    id: 'clickjacking-protection',
    title: 'Page cannot be framed (X-Frame-Options or CSP frame-ancestors)',
    run: (ctx) => {
      const xfo = ctx.headers['x-frame-options'];
      const csp = ctx.headers['content-security-policy'] ?? '';
      const passed = Boolean(xfo) || /frame-ancestors/i.test(csp);
      return { passed, detail: xfo ?? (passed ? 'CSP frame-ancestors' : 'neither header present') };
    },
  },
  {
    id: 'content-security-policy',
    title: 'Content-Security-Policy is set',
    run: (ctx) => {
      const value = ctx.headers['content-security-policy'];
      return { passed: Boolean(value), detail: value ? 'present' : 'header missing' };
    },
  },
  {
    id: 'referrer-policy',
    title: 'Referrer-Policy is set',
    run: (ctx) => {
      const value = ctx.headers['referrer-policy'];
      return { passed: Boolean(value), detail: value ?? 'header missing' };
    },
  },
  {
    id: 'info-disclosure',
    title: 'Response does not reveal server software or version',
    run: (ctx) => {
      const leaks: string[] = [];
      const server = ctx.headers['server'];
      if (server && /\d+\.\d+/.test(server)) leaks.push(`Server: ${server}`);
      const poweredBy = ctx.headers['x-powered-by'];
      if (poweredBy) leaks.push(`X-Powered-By: ${poweredBy}`);
      return { passed: leaks.length === 0, detail: leaks.join('; ') || 'nothing revealed' };
    },
  },
  {
    id: 'cookie-flags',
    title: 'Cookies are Secure, HttpOnly and SameSite',
    run: (ctx) => {
      if (ctx.setCookies.length === 0) return { passed: true, detail: 'no cookies set on first response' };
      const weak = ctx.setCookies
        .map((cookie) => {
          const missing = ['secure', 'httponly', 'samesite'].filter(
            (flag) => !new RegExp(`(^|;\\s*)${flag}(=|;|$)`, 'i').test(cookie),
          );
          return missing.length ? `${cookie.split('=')[0]} (missing ${missing.join(', ')})` : null;
        })
        .filter((entry): entry is string => entry !== null);
      return { passed: weak.length === 0, detail: weak.join('; ') || 'all cookies have the flags' };
    },
  },
  {
    id: 'tls-certificate',
    title: 'TLS certificate is valid and not expiring within 14 days',
    run: (ctx) => {
      if (!ctx.tls) return { passed: false, detail: 'site is not served over https' };
      if ('error' in ctx.tls) return { passed: false, detail: ctx.tls.error };
      return {
        passed: ctx.tls.daysUntilExpiry > 14,
        detail: `${ctx.tls.daysUntilExpiry} day(s) until expiry`,
      };
    },
  },
];
