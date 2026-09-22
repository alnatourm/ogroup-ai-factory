// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ArabicAiIpaasClient,
  AUTHENTICATION_REQUIRED_EVENT,
} from './client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser session expiry handling', () => {
  it('emits reauthentication and stops document registration on HTTP 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'INVALID_AUTHENTICATION' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const listener = vi.fn();
    window.addEventListener(AUTHENTICATION_REQUIRED_EVENT, listener, { once: true });

    await expect(ArabicAiIpaasClient.processDocument(
      new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' }),
    )).rejects.toThrow('AUTHENTICATION_REQUIRED');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
