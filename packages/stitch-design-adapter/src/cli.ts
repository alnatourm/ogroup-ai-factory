import { readFile } from 'node:fs/promises';
import {
  createStitchDesignAdapterFromEnvironment,
  runStitchDesignAgent,
  type DesignAgentRequest,
} from './index.js';

async function main(): Promise<void> {
  const requestPath = process.argv[2];
  if (!requestPath) {
    throw new Error('Usage: tsx cli.ts <design-request.json>');
  }

  const raw = await readFile(requestPath, 'utf8');
  const request = JSON.parse(raw) as DesignAgentRequest;
  const adapter = await createStitchDesignAdapterFromEnvironment();
  const result = await runStitchDesignAgent(adapter, request);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`STITCH_DESIGN_AGENT_FAILED: ${message}\n`);
  process.exitCode = 1;
});
