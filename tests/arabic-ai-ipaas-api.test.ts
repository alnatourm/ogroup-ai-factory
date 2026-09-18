import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../apps/arabic-ai-ipaas-api/src/app.js';

const ownerHeaders = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'user-1',
  'x-workspace-role': 'workspace_owner',
};

describe('Arabic AI iPaaS control API v0.1', () => {
  it('requires workspace context', async () => {
    const response = await request(createApp()).get('/v1/provider-connections');
    expect(response.status).toBe(401);
  });

  it('never returns provider secrets', async () => {
    const app = createApp({ masterKey: 'unit-test-master-key' });
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
    const app = createApp({ masterKey: 'unit-test-master-key' });
    await request(app).post('/v1/provider-connections').set(ownerHeaders).send({
      providerType: 'gemini',
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

  it('serves an OpenAI-compatible completion shape through the provider adapter', async () => {
    const app = createApp({ masterKey: 'unit-test-master-key' });
    await request(app).post('/v1/provider-connections').set(ownerHeaders).send({
      providerType: 'openai-compatible',
      name: 'Primary',
      apiKey: 'adapter-secret',
    });

    const response = await request(app)
      .post('/v1/chat/completions')
      .set(ownerHeaders)
      .send({
        model: 'pilot-model',
        messages: [{ role: 'user', content: 'مرحبا بالعالم' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.object).toBe('chat.completion');
    expect(response.body.choices[0].message.role).toBe('assistant');
    expect(response.body.choices[0].message.content).toContain('مرحبا بالعالم');
  });
});
