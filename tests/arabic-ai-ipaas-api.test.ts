import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { hashApiKey, InMemoryApiKeyVerifier } from '../apps/arabic-ai-ipaas-api/src/auth.js';
import { createApp } from '../apps/arabic-ai-ipaas-api/src/app.js';
import { OpenAICompatibleProviderAdapter } from '../apps/arabic-ai-ipaas-api/src/provider-adapter.js';

const ownerHeaders = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'user-1',
  'x-workspace-role': 'workspace_owner',
};

function testApp() {
  return createApp({
    masterKey: 'unit-test-master-key',
    allowInsecureTestHeaders: true,
  });
}

describe('Arabic AI iPaaS control API v0.2', () => {
  it('fails closed when the provider encryption key is missing', () => {
    const previous = process.env.PROVIDER_SECRET_MASTER_KEY;
    delete process.env.PROVIDER_SECRET_MASTER_KEY;
    expect(() => createApp()).toThrow('PROVIDER_SECRET_MASTER_KEY_REQUIRED');
    if (previous) process.env.PROVIDER_SECRET_MASTER_KEY = previous;
  });

  it('requires authentication', async () => {
    const response = await request(testApp()).get('/v1/provider-connections');
    expect(response.status).toBe(401);
  });

  it('accepts verified bearer API keys', async () => {
    const rawKey = 'factory_test_key';
    const verifier = new InMemoryApiKeyVerifier(new Map([
      [hashApiKey(rawKey), {
        apiKeyId: 'key-1',
        workspaceId: 'workspace-a',
        userId: 'api-key:key-1',
        role: 'developer',
        scopes: ['gateway:write'],
      }],
    ]));
    const app = createApp({
      masterKey: 'unit-test-master-key',
      apiKeyVerifier: verifier,
    });

    const response = await request(app)
      .get('/v1/provider-connections')
      .set('authorization', `Bearer ${rawKey}`);

    expect(response.status).toBe(200);
  });

  it('never returns provider secrets', async () => {
    const app = testApp();
    const created = await request(app)
      .post('/v1/provider-connections')
      .set(ownerHeaders)
      .send({
        providerType: 'openai-compatible',
        name: 'Primary model',
        apiKey: 'unit-test-secret-value',
        modelDefault: 'example-model',
      });

    expect(created.status).toBe(201);
    expect(JSON.stringify(created.body)).not.toContain('unit-test-secret-value');
    expect(created.body.data.hasSecret).toBe(true);

    const listed = await request(app).get('/v1/provider-connections').set(ownerHeaders);
    expect(listed.status).toBe(200);
    expect(JSON.stringify(listed.body)).not.toContain('unit-test-secret-value');
  });

  it('isolates provider connections by workspace', async () => {
    const app = testApp();
    await request(app).post('/v1/provider-connections').set(ownerHeaders).send({
      providerType: 'openai-compatible',
      name: 'A provider',
      apiKey: 'workspace-a-secret',
    });

    const other = await request(app)
      .get('/v1/provider-connections')
      .set({
        'x-workspace-id': 'workspace-b',
        'x-user-id': 'user-2',
        'x-workspace-role': 'workspace_owner',
      });

    expect(other.status).toBe(200);
    expect(other.body.data).toEqual([]);
  });

  it('calls an OpenAI-compatible upstream without exposing the stored secret', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toEqual(expect.objectContaining({
        authorization: 'Bearer adapter-secret',
      }));
      return new Response(JSON.stringify({
        model: 'pilot-model',
        choices: [{ message: { content: 'أهلاً بك' } }],
        usage: { prompt_tokens: 7, completion_tokens: 3 },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const adapter = new OpenAICompatibleProviderAdapter(fetchMock as typeof fetch);
    const app = createApp({
      masterKey: 'unit-test-master-key',
      adapter,
      allowInsecureTestHeaders: true,
    });

    await request(app).post('/v1/provider-connections').set(ownerHeaders).send({
      providerType: 'openai-compatible',
      name: 'Primary',
      apiKey: 'adapter-secret',
      baseUrl: 'https://provider.example',
      modelDefault: 'pilot-model',
    });

    const response = await request(app)
      .post('/v1/chat/completions')
      .set(ownerHeaders)
      .send({
        messages: [{ role: 'user', content: 'مرحبا بالعالم' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.object).toBe('chat.completion');
    expect(response.body.choices[0].message.content).toBe('أهلاً بك');
    expect(response.body.usage.total_tokens).toBe(10);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://provider.example/chat/completions');
  });

  it('rejects insecure provider URLs in production adapter', async () => {
    const adapter = new OpenAICompatibleProviderAdapter(vi.fn() as unknown as typeof fetch);
    await expect(adapter.complete({
      messages: [{ role: 'user', content: 'test' }],
    }, {
      id: 'p1',
      workspaceId: 'w1',
      providerType: 'openai-compatible',
      name: 'unsafe',
      baseUrl: 'http://localhost:1234',
      secretCiphertext: 'encrypted',
      config: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 'secret')).rejects.toThrow('PROVIDER_BASE_URL_MUST_USE_HTTPS');
  });
});


describe('OpenAI-compatible base URL composition', () => {
  it('preserves provider path prefixes such as Groq /openai/v1', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe('https://api.groq.com/openai/v1/chat/completions');
      return new Response(JSON.stringify({
        model: 'openai/gpt-oss-20b',
        choices: [{ message: { content: 'تم' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const adapter = new OpenAICompatibleProviderAdapter(fetchMock as typeof fetch);
    await adapter.complete(
      { model: 'openai/gpt-oss-20b', messages: [{ role: 'user', content: 'اختبار' }] },
      {
        id: 'groq',
        workspaceId: 'w1',
        providerType: 'openai-compatible',
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        modelDefault: 'openai/gpt-oss-20b',
        secretCiphertext: 'encrypted',
        config: {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'secret',
    );
  });
});
