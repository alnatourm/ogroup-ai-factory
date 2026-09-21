import crypto from 'node:crypto';
import type {
  AcceptedMediaType,
  DocumentExtractionRecord,
  DocumentRecord,
} from './types.js';

export const ACCEPTED_MEDIA_TYPES = new Set<AcceptedMediaType>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
]);

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateDocumentUpload(
  filename: unknown,
  mediaType: unknown,
  sizeBytes: unknown,
): { filename: string; mediaType: AcceptedMediaType; sizeBytes: number } {
  if (typeof filename !== 'string' || filename.trim().length === 0) {
    throw new Error('INVALID_FILENAME: Filename is required');
  }

  // Prevent directory traversal or illegal characters
  const sanitizedFilename = filename.trim();
  if (sanitizedFilename.includes('..') || sanitizedFilename.includes('/') || sanitizedFilename.includes('\\')) {
    throw new Error('INVALID_FILENAME: Path separators and traversal characters are not permitted');
  }

  if (typeof mediaType !== 'string' || !ACCEPTED_MEDIA_TYPES.has(mediaType as AcceptedMediaType)) {
    throw new Error(
      `UNSUPPORTED_MEDIA_TYPE: Supported formats are ${[...ACCEPTED_MEDIA_TYPES].join(', ')}`,
    );
  }

  const numericSize = Number(sizeBytes);
  if (isNaN(numericSize) || numericSize <= 0) {
    throw new Error('INVALID_FILE_SIZE: Size must be greater than 0 bytes');
  }

  if (numericSize > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`FILE_TOO_LARGE: Maximum allowed file size is ${MAX_DOCUMENT_SIZE_BYTES} bytes (25MB)`);
  }

  return {
    filename: sanitizedFilename,
    mediaType: mediaType as AcceptedMediaType,
    sizeBytes: numericSize,
  };
}

export interface DocumentRepository {
  create(input: {
    workspaceId: string;
    filename: string;
    mediaType: string;
    sizeBytes: number;
    createdBy?: string;
  }): Promise<DocumentRecord>;
  get(workspaceId: string, id: string): Promise<DocumentRecord | undefined>;
  list(workspaceId: string): Promise<DocumentRecord[]>;
  updateStatus(
    workspaceId: string,
    id: string,
    status: DocumentRecord['status'],
  ): Promise<DocumentRecord | undefined>;
  createOrUpdateExtraction(
    workspaceId: string,
    documentId: string,
    extraction: Omit<DocumentExtractionRecord, 'id' | 'workspaceId' | 'documentId' | 'createdAt'>,
  ): Promise<DocumentExtractionRecord>;
  getExtraction(workspaceId: string, documentId: string): Promise<DocumentExtractionRecord | undefined>;
}

export class MemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();
  private readonly extractions = new Map<string, DocumentExtractionRecord>();

  async create(input: {
    workspaceId: string;
    filename: string;
    mediaType: string;
    sizeBytes: number;
    createdBy?: string;
  }): Promise<DocumentRecord> {
    const id = crypto.randomUUID();
    const doc: DocumentRecord = {
      id,
      workspaceId: input.workspaceId,
      filename: input.filename,
      mediaType: input.mediaType,
      objectKey: `documents/${input.workspaceId}/${id}/${input.filename}`,
      sizeBytes: input.sizeBytes,
      status: 'uploaded',
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.documents.set(id, doc);
    return doc;
  }

  async get(workspaceId: string, id: string): Promise<DocumentRecord | undefined> {
    const doc = this.documents.get(id);
    return doc?.workspaceId === workspaceId ? doc : undefined;
  }

  async list(workspaceId: string): Promise<DocumentRecord[]> {
    return [...this.documents.values()]
      .filter((d) => d.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    status: DocumentRecord['status'],
  ): Promise<DocumentRecord | undefined> {
    const doc = await this.get(workspaceId, id);
    if (!doc) return undefined;
    doc.status = status;
    this.documents.set(id, doc);
    return doc;
  }

  async createOrUpdateExtraction(
    workspaceId: string,
    documentId: string,
    extraction: Omit<DocumentExtractionRecord, 'id' | 'workspaceId' | 'documentId' | 'createdAt'>,
  ): Promise<DocumentExtractionRecord> {
    const existing = this.extractions.get(documentId);
    const record: DocumentExtractionRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      workspaceId,
      documentId,
      schemaVersion: extraction.schemaVersion ?? 'document-extraction-json-v1',
      engineVersion: extraction.engineVersion,
      markdown: extraction.markdown,
      structuredJson: extraction.structuredJson,
      language: extraction.language,
      pageCount: extraction.pageCount,
      status: extraction.status,
      errorMessage: extraction.errorMessage,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.extractions.set(documentId, record);
    return record;
  }

  async getExtraction(workspaceId: string, documentId: string): Promise<DocumentExtractionRecord | undefined> {
    const ext = this.extractions.get(documentId);
    return ext?.workspaceId === workspaceId ? ext : undefined;
  }
}

/**
 * Initiates document processing.
 * CRITICAL PRODUCTION RULE:
 * If sovereign OCR engine is not wired, NEVER fabricate simulated extraction text or claim fake success.
 * Returns explicit 'processing' or 'not_configured' state.
 */
export async function queueDocumentExtraction(
  workspaceId: string,
  documentId: string,
  repository: DocumentRepository,
): Promise<{ document: DocumentRecord; extraction: DocumentExtractionRecord; configured: boolean }> {
  const document = await repository.get(workspaceId, documentId);
  if (!document) throw new Error('DOCUMENT_NOT_FOUND');

  await repository.updateStatus(workspaceId, documentId, 'processing');
  const extraction = await repository.createOrUpdateExtraction(workspaceId, documentId, {
    schemaVersion: 'document-extraction-json-v1',
    engineVersion: undefined,
    status: 'processing',
    errorMessage: 'OCR_ENGINE_NOT_CONFIGURED: No enabled OCR-capable provider and executable adapter are configured.',
    markdown: undefined,
    structuredJson: undefined,
    language: undefined,
    pageCount: undefined,
  });

  return {
    document: { ...document, status: 'processing' },
    extraction,
    configured: false,
  };
}
