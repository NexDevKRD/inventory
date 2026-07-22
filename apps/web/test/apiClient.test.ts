import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from '../src/lib/apiClient';

describe('createApiClient', () => {
  it('attaches bearer token from the provided getter', async () => {
    const client = createApiClient(() => 'abc123');
    const config = await client.interceptors.request.handlers![0]!.fulfilled({ headers: {} } as any);
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });
});
