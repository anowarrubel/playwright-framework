/**
 * Environment resolution. The single source of truth for "which env are we on?".
 * Driven by the TEST_ENV variable; defaults to "qa".
 */

export type TestEnv = 'dev' | 'qa' | 'prod';

const VALID_ENVS: TestEnv[] = ['dev', 'qa', 'prod'];

export function getCurrentEnv(): TestEnv {
  const raw = (process.env.TEST_ENV ?? 'qa').trim().toLowerCase();
  if (!VALID_ENVS.includes(raw as TestEnv)) {
    throw new Error(
      `Invalid TEST_ENV="${raw}". Expected one of: ${VALID_ENVS.join(', ')}`,
    );
  }
  return raw as TestEnv;
}

export function isProd(): boolean {
  return getCurrentEnv() === 'prod';
}
