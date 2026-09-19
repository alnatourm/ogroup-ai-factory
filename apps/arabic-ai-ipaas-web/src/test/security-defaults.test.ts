import { beforeEach, describe, expect, it } from 'vitest';
import { getApiConfig, resetApiConfig } from '../api/config';

describe('frontend security defaults', () => {
  beforeEach(() => {
    resetApiConfig();
  });

  it('does not enable mock fallback by default', () => {
    expect(getApiConfig().useMockFallback).toBe(false);
  });

  it('does not enable development identity headers by default', () => {
    expect(getApiConfig().allowDevIdentityHeaders).toBe(false);
  });

  it('does not grant owner privileges by default', () => {
    expect(getApiConfig().role).toBe('viewer');
  });
});
