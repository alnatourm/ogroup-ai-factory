import { readFile, writeFile } from 'node:fs/promises';
import {
  reviewGeneratedDesign,
  type GeneratedDesignResult,
  type ReviewRequest,
} from './index.js';

async function main(): Promise<void> {
  const [requestPath, generatedPath, outputPath = 'design-review-result.json'] = process.argv.slice(2);
  if (!requestPath || !generatedPath) {
    throw new Error('Usage: tsx cli.ts <design-request.json> <stitch-result.json> [output.json]');
  }

  const request = JSON.parse(await readFile(requestPath, 'utf8')) as ReviewRequest;
  const generated = JSON.parse(await readFile(generatedPath, 'utf8')) as GeneratedDesignResult;
  const result = await reviewGeneratedDesign(request, generated);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  process.stdout.write(`${result.status} score=${result.score} passed=${result.summary.passedScreens}/${result.summary.expectedScreens}\n`);

  if (result.status !== 'DESIGN_PASS') {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DESIGN_REVIEW_AGENT_FAILED: ${message}\n`);
  process.exitCode = 1;
});
