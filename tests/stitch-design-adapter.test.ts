import { describe, expect, it } from 'vitest';
import {
  StitchConfigurationError,
  StitchDesignAdapter,
  runStitchDesignAgent,
  type StitchToolClientLike,
} from '../packages/stitch-design-adapter/src/index.js';

class FakeStitchClient implements StitchToolClientLike {
  readonly calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  closed = false;

  async listTools() {
    return {
      tools: [
        { name: 'create_project' },
        { name: 'generate_screen_from_text' },
        { name: 'get_screen' },
      ],
    };
  }

  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    this.calls.push({ name, args });

    if (name === 'create_project') {
      return { result: 'projects/project-123' } as T;
    }

    if (name === 'generate_screen_from_text') {
      return {
        result: {
          name: 'projects/project-123/screens/screen-456',
        },
      } as T;
    }

    if (name === 'get_screen') {
      return {
        name: 'projects/project-123/screens/screen-456',
        html: 'https://example.test/screen-456.html',
        screenshot: 'https://example.test/screen-456.png',
      } as T;
    }

    throw new Error(`Unexpected tool: ${name}`);
  }

  async close() {
    this.closed = true;
  }
}

describe('Stitch design adapter', () => {
  it('runs a Factory design handoff through Stitch tools', async () => {
    const client = new FakeStitchClient();
    const adapter = new StitchDesignAdapter(client);

    const result = await runStitchDesignAgent(adapter, {
      productId: 'arabic-ai-ipaas',
      projectTitle: 'Arabic AI iPaaS',
      screens: [
        {
          key: 'gateway-playground',
          title: 'Gateway Playground',
          prompt: 'Arabic-first RTL gateway playground.',
          deviceType: 'DESKTOP',
        },
      ],
    });

    expect(result.status).toBe('DESIGN_GENERATED');
    expect(result.projectId).toBe('project-123');
    expect(result.screens[0]).toMatchObject({
      screenId: 'screen-456',
      htmlUrl: 'https://example.test/screen-456.html',
      imageUrl: 'https://example.test/screen-456.png',
    });
    expect(client.calls.map((call) => call.name)).toEqual([
      'create_project',
      'generate_screen_from_text',
      'get_screen',
    ]);
    expect(client.closed).toBe(true);
  });

  it('refuses to run if Stitch lacks a required agent tool', async () => {
    const client: StitchToolClientLike = {
      async listTools() {
        return { tools: [{ name: 'create_project' }] };
      },
      async callTool<T = unknown>(): Promise<T> {
        throw new Error('not expected');
      },
    };

    const adapter = new StitchDesignAdapter(client);
    await expect(adapter.readiness()).rejects.toBeInstanceOf(StitchConfigurationError);
  });
});
