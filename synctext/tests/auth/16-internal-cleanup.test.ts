import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/*
The 401 gate of POST /api/internal/auth/cleanup, moved here from
tests/e2e/14-authorization.spec.ts: nginx answers 404 for /api/internal/* on the
public internet (services/nginx/conf.template:27-30) - correct, but it means the
e2e suite can never observe the 401. What is asserted here is the route wiring:
isAuthorized (unit-tested in 02-internal-auth.test.ts) runs before any database
access and the route answers 401 { error: "Unauthorized" }.
*/

vi.mock('@synctext/db', () => ({
  prisma: {},
  GroupRole: { OWNER: 'OWNER', ADMIN: 'ADMIN', MEMBER: 'MEMBER' },
}));

import { POST } from '../../app/api/internal/auth/cleanup/route';

const SECRET = 'super-secret-internal-token-0123456789abcdef';

function cleanupRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/internal/auth/cleanup', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/internal/auth/cleanup', () => {
  beforeEach(() => {
    process.env.INTERNAL_SERVICE_TOKEN = SECRET;
  });
  afterEach(() => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
  });

  it('answers 401 {error:Unauthorized} for a wrong service token', async () => {
    const res = await POST(
      cleanupRequest({ 'x-internal-service-token': 'not-the-real-token' }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('answers 401 {error:Unauthorized} when the header is absent', async () => {
    const res = await POST(cleanupRequest({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});
