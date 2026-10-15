import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from '@playwright/test';

/*
/api/internal/* is deliberately 404 for the public internet
(services/nginx/conf.template:27-30), so a Playwright request through baseURL can
never reach those handlers. The sweep tests still have to prove what the handler
does with a valid service token, so the POST runs inside the collab container,
which is on the backend network and already holds WEB_INTERNAL_URL +
INTERNAL_SERVICE_TOKEN (compose.yaml:157-159). Transport is db-state.sh, which
knows how to find the compose project and how this checkout names the service.

Must be called from a test body (test.info() is unavailable in hooks).
stdout of db-state.sh is: first line "HTTPSTATUS <code>", rest is the body.
*/
export type InternalResponse = { status: number; body: string };

export function internalPost(path: string): InternalResponse {
  const configFile = test.info().config.configFile;
  if (!configFile) throw new Error('playwright.config.ts not found');
  const script = join(dirname(configFile), 'tests', 'db-state.sh');

  const out = execFileSync('bash', [script, 'internal-post', path], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'], // compose errors stay visible on stderr
    timeout: 20_000, // sync call: bound it well below the 30s test timeout
  });

  const [head, ...rest] = out.trim().split('\n');
  const status = Number(head?.slice('HTTPSTATUS '.length));
  if (!Number.isFinite(status)) {
    throw new Error(`unexpected internal-post output:\n${out}`);
  }
  return { status, body: rest.join('\n') };
}
