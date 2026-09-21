import crypto from 'node:crypto';
import type { DocumentContentStore } from './document-content-store.js';
import type { DocumentRepository } from './document-service.js';
import type { DocumentOcrAdapter } from './document-ocr-adapter.js';
import type { AcceptedMediaType, ProviderConnection } from './types.js';

function stableErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : 'OCR_PROCESSING_FAILED';
  const code = message.split(':')[0] ?? 'OCR_PROCESSING_FAILED';
  return /^[A-Z0-9_]+$/.test(code) ? code : 'OCR_PROCESSING_FAILED';
}

export async function runDocumentOcr(input: {
  workspaceId: string;
  documentId: string;
  documentRepository: DocumentRepository;
  contentStore: DocumentContentStore;
  provider: ProviderConnection;
  secret: string;
  adapter: DocumentOcrAdapter;
}) {
  const document = await input.documentRepository.get(input.workspaceId, input.documentId);
  if (!document) throw new Error('DOCUMENT_NOT_FOUND');
  const stored = await input.contentStore.get(input.workspaceId, input.documentId);
  if (!stored) throw new Error('DOCUMENT_CONTENT_REQUIRED');
  const actualSha256 = crypto.createHash('sha256').update(stored.content).digest('hex');
  if (actualSha256 !== stored.metadata.sha256) throw new Error('DOCUMENT_CONTENT_INTEGRITY_FAILED');
  if (!input.adapter.supports(input.provider)) throw new Error('OCR_PROVIDER_NOT_ENABLED');

  await input.documentRepository.updateStatus(input.workspaceId, input.documentId, 'processing');
  await input.documentRepository.createOrUpdateExtraction(input.workspaceId, input.documentId, {
    schemaVersion: 'document-extraction-json-v1',
    engineVersion: undefined,
    status: 'processing',
    errorMessage: undefined,
  });

  try {
    const result = await input.adapter.extract({
      content: stored.content,
      mediaType: document.mediaType as AcceptedMediaType,
      filename: document.filename,
      provider: input.provider,
      secret: input.secret,
    });
    const extraction = await input.documentRepository.createOrUpdateExtraction(
      input.workspaceId,
      input.documentId,
      {
        schemaVersion: 'document-extraction-json-v1',
        engineVersion: result.engineVersion,
        markdown: result.markdown,
        structuredJson: result.structuredJson,
        language: result.language,
        pageCount: result.pageCount,
        status: 'ready',
        errorMessage: undefined,
      },
    );
    const readyDocument = await input.documentRepository.updateStatus(
      input.workspaceId,
      input.documentId,
      'ready',
    );
    if (!readyDocument) throw new Error('DOCUMENT_NOT_FOUND');
    return { document: readyDocument, extraction, configured: true };
  } catch (error) {
    const code = stableErrorCode(error);
    await input.documentRepository.updateStatus(input.workspaceId, input.documentId, 'failed');
    await input.documentRepository.createOrUpdateExtraction(input.workspaceId, input.documentId, {
      schemaVersion: 'document-extraction-json-v1',
      engineVersion: undefined,
      status: 'failed',
      errorMessage: code,
    });
    throw new Error(code);
  }
}
