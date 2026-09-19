import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { ApiKeyVerifier } from './auth.js';
import { MemoryProviderRepository } from './memory-repository.js';
import { OpenAICompatibleProviderAdapter, type ProviderAdapter } from './provider-adapter.js';
import type { ProviderRepository } from './postgres.js';
import { decryptSecret, encryptSecret, redactProvider, validateProviderBaseUrl } from './security.js';
import type { GatewayRequest, ProviderType, RequestContext, WorkspaceRole } from './types.js';

type FactoryRequest = Request & { factoryContext?: RequestContext };

function setContext(req: Request, context: RequestContext): void {
  (req as FactoryRequest).factoryContext = context;
}

function getContext(req: Request): RequestContext {
  const context = (req as FactoryRequest).factoryContext;
  if (!context) throw new Error('FACTORY_CONTEXT_MISSING');
  return context;
}

const VALID_ROLES = new Set<WorkspaceRole>([
  'workspace_owner',
  'workspace_admin',
  'developer',
  'automation_builder',
  'viewer',
  'partner_admin',
]);

const VALID_PROVIDER_TYPES = new Set<ProviderType>([
  'openai-compatible',
  'gemini',
  'anthropic-compatible',
  'custom-http',
]);

function buildContextMiddleware(
  apiKeyVerifier: ApiKeyVerifier | undefined,
  allowInsecureTestHeaders: boolean,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.header('authorization');
    if (auth?.startsWith('Bearer ') && apiKeyVerifier) {
      const verified = await apiKeyVerifier.verify(auth.slice('Bearer '.length).trim());
      if (verified) {
        setContext(req, {
          workspaceId: verified.workspaceId,
          userId: verified.userId,
          role: verified.role,
        });
        next();
        return;
      }
    }

    if (allowInsecureTestHeaders) {
      const workspaceId = req.header('x-workspace-id');
      const userId = req.header('x-user-id');
      const role = req.header('x-workspace-role') as WorkspaceRole | undefined;
      if (workspaceId && userId && role && VALID_ROLES.has(role)) {
        setContext(req, { workspaceId, userId, role });
        next();
        return;
      }
    }

    res.status(401).json({ error: 'INVALID_AUTHENTICATION' });
  };
}

function requireWriteRole(req: Request, res: Response, next: NextFunction): void {
  const role = getContext(req).role;
  if (!role || !['workspace_owner', 'workspace_admin', 'developer'].includes(role)) {
    res.status(403).json({ error: 'INSUFFICIENT_ROLE' });
    return;
  }
  next();
}

export function createApp(options: {
  masterKey?: string;
  providerRepository?: ProviderRepository;
  adapter?: ProviderAdapter;
  apiKeyVerifier?: ApiKeyVerifier;
  allowInsecureTestHeaders?: boolean;
} = {}) {
  const app = express();
  const repository = options.providerRepository ?? new MemoryProviderRepository();
  const adapter = options.adapter ?? new OpenAICompatibleProviderAdapter();
  const masterKey = options.masterKey ?? process.env.PROVIDER_SECRET_MASTER_KEY;

  if (!masterKey) {
    throw new Error('PROVIDER_SECRET_MASTER_KEY_REQUIRED');
  }

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'arabic-ai-ipaas-control-api', version: '0.2.0' });
  });

  app.use(
    '/v1',
    buildContextMiddleware(options.apiKeyVerifier, options.allowInsecureTestHeaders === true),
  );

  app.get('/v1/provider-connections', async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      res.json({ data: (await repository.list(workspaceId)).map(redactProvider) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/provider-connections', requireWriteRole, async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      const { providerType, name, apiKey, baseUrl, modelDefault, config } = req.body as {
        providerType?: ProviderType;
        name?: string;
        apiKey?: string;
        baseUrl?: string;
        modelDefault?: string;
        config?: Record<string, unknown>;
      };

      if (!providerType || !VALID_PROVIDER_TYPES.has(providerType) || !name || !apiKey) {
        res.status(400).json({ error: 'INVALID_PROVIDER_CONNECTION' });
        return;
      }

      if (baseUrl) {
        validateProviderBaseUrl(baseUrl);
      }

      const provider = await repository.create({
        workspaceId,
        providerType,
        name,
        ...(baseUrl ? { baseUrl } : {}),
        ...(modelDefault ? { modelDefault } : {}),
        secretCiphertext: encryptSecret(apiKey, masterKey),
        ...(config ? { config } : {}),
      });

      res.status(201).json({ data: redactProvider(provider) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/v1/provider-connections/:id', requireWriteRole, async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      const providerId = req.params.id;
      if (typeof providerId !== 'string' || !(await repository.remove(workspaceId, providerId))) {
        res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post('/v1/chat/completions', async (req, res, next) => {
    try {
      const workspaceId = getContext(req).workspaceId;
      const providers = (await repository.list(workspaceId)).filter((item) => item.status === 'active');
      const provider = providers[0];
      if (!provider) {
        res.status(409).json({ error: 'NO_ACTIVE_PROVIDER_CONNECTION' });
        return;
      }

      if (provider.providerType !== 'openai-compatible') {
        res.status(501).json({ error: 'PROVIDER_ADAPTER_NOT_IMPLEMENTED', providerType: provider.providerType });
        return;
      }

      const input = req.body as GatewayRequest;
      if (!Array.isArray(input.messages) || input.messages.length === 0) {
        res.status(400).json({ error: 'MESSAGES_REQUIRED' });
        return;
      }

      const secret = decryptSecret(provider.secretCiphertext, masterKey);
      const completion = await adapter.complete(input, provider, secret);
      const created = Math.floor(Date.now() / 1000);

      res.json({
        id: `chatcmpl_${crypto.randomUUID()}`,
        object: 'chat.completion',
        created,
        model: completion.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: completion.content },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: completion.promptTokens,
          completion_tokens: completion.completionTokens,
          total_tokens: completion.promptTokens + completion.completionTokens,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    res.status(500).json({ error: 'INTERNAL_ERROR', message });
  });

  return app;
}
