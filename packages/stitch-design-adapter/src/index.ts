export type StitchDeviceType = 'MOBILE' | 'DESKTOP' | 'TABLET' | 'AGNOSTIC';

export interface StitchToolDescriptor {
  name: string;
  description?: string;
}

export interface StitchToolClientLike {
  listTools(): Promise<{ tools: StitchToolDescriptor[] }>;
  callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T>;
  close?(): Promise<void>;
}

export interface DesignScreenRequest {
  key: string;
  title: string;
  prompt: string;
  deviceType?: StitchDeviceType;
}

export interface DesignAgentRequest {
  productId: string;
  projectTitle: string;
  screens: DesignScreenRequest[];
}

export interface StitchScreenArtifact {
  key: string;
  title: string;
  projectId: string;
  screenId: string | null;
  htmlUrl: string | null;
  imageUrl: string | null;
}

export interface DesignAgentResult {
  provider: 'stitch';
  productId: string;
  projectId: string;
  screens: StitchScreenArtifact[];
  status: 'DESIGN_GENERATED';
}

export class StitchConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StitchConfigurationError';
  }
}

const REQUIRED_TOOLS = [
  'create_project',
  'generate_screen_from_text',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function walk(value: unknown, visit: (value: unknown) => string | null): string | null {
  const direct = visit(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = walk(item, visit);
      if (found) return found;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  for (const child of Object.values(record)) {
    const found = walk(child, visit);
    if (found) return found;
  }

  return null;
}

function findResourceId(payload: unknown, kind: 'projects' | 'screens'): string | null {
  return walk(payload, (value) => {
    if (typeof value !== 'string') return null;
    const match = value.match(new RegExp(`${kind}/([^/\\s]+)`));
    return match?.[1] ?? null;
  });
}

function findUrl(payload: unknown, matcher: RegExp): string | null {
  return walk(payload, (value) => {
    if (typeof value !== 'string') return null;
    if (!/^https?:\/\//i.test(value)) return null;
    return matcher.test(value) ? value : null;
  });
}

export class StitchDesignAdapter {
  constructor(private readonly client: StitchToolClientLike) {}

  async readiness(): Promise<{ ready: true; tools: string[] }> {
    const { tools } = await this.client.listTools();
    const names = tools.map((tool) => tool.name);
    const missing = REQUIRED_TOOLS.filter((tool) => !names.includes(tool));

    if (missing.length > 0) {
      throw new StitchConfigurationError(
        `Stitch is connected but required tools are missing: ${missing.join(', ')}`,
      );
    }

    return { ready: true, tools: names };
  }

  async createProject(title: string): Promise<string> {
    const response = await this.client.callTool('create_project', { title });
    const projectId = findResourceId(response, 'projects');

    if (!projectId) {
      throw new StitchConfigurationError('Stitch create_project returned no project id.');
    }

    return projectId;
  }

  async generateScreen(
    projectId: string,
    screen: DesignScreenRequest,
  ): Promise<StitchScreenArtifact> {
    const generated = await this.client.callTool('generate_screen_from_text', {
      projectId,
      prompt: screen.prompt,
      deviceType: screen.deviceType ?? 'DESKTOP',
    });

    const screenId = findResourceId(generated, 'screens');

    return {
      key: screen.key,
      title: screen.title,
      projectId,
      screenId,
      htmlUrl: findUrl(generated, /html|download/i),
      imageUrl: findUrl(generated, /image|screenshot|png|jpg|jpeg|webp/i),
    };
  }

  async close(): Promise<void> {
    await this.client.close?.();
  }
}

export async function createStitchDesignAdapterFromEnvironment(): Promise<StitchDesignAdapter> {
  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    throw new StitchConfigurationError(
      'STITCH_API_KEY is not configured in the Factory execution environment.',
    );
  }

  const { StitchToolClient } = await import('@google/stitch-sdk');
  return new StitchDesignAdapter(new StitchToolClient({ apiKey }));
}

export async function runStitchDesignAgent(
  adapter: StitchDesignAdapter,
  request: DesignAgentRequest,
): Promise<DesignAgentResult> {
  if (request.screens.length === 0) {
    throw new StitchConfigurationError('Design Agent received no screen requests.');
  }

  await adapter.readiness();
  const projectId = await adapter.createProject(request.projectTitle);
  const screens: StitchScreenArtifact[] = [];

  try {
    for (const screen of request.screens) {
      screens.push(await adapter.generateScreen(projectId, screen));
    }
  } finally {
    await adapter.close();
  }

  return {
    provider: 'stitch',
    productId: request.productId,
    projectId,
    screens,
    status: 'DESIGN_GENERATED',
  };
}
