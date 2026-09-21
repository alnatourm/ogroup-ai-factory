import crypto from 'node:crypto';
import type { DocumentRecord } from './types.js';
import { MAX_DOCUMENT_SIZE_BYTES } from './document-service.js';

export type DocumentContentMetadata = {
  workspaceId: string;
  documentId: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
};

export interface DocumentContentStore {
  put(input: {
    workspaceId: string;
    documentId: string;
    mediaType: string;
    content: Buffer;
  }): Promise<DocumentContentMetadata>;
  getMetadata(workspaceId: string, documentId: string): Promise<DocumentContentMetadata | undefined>;
  get(
    workspaceId: string,
    documentId: string,
  ): Promise<{ metadata: DocumentContentMetadata; content: Buffer } | undefined>;
  has(workspaceId: string, documentId: string): Promise<boolean>;
}

function hasSignature(mediaType: string, content: Buffer): boolean {
  if (mediaType === 'application/pdf') return content.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mediaType === 'image/png') {
    return content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mediaType === 'image/jpeg') {
    return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  }
  if (mediaType === 'image/tiff') {
    const littleEndian = content.length >= 4 && content[0] === 0x49 && content[1] === 0x49 && content[2] === 0x2a && content[3] === 0x00;
    const bigEndian = content.length >= 4 && content[0] === 0x4d && content[1] === 0x4d && content[2] === 0x00 && content[3] === 0x2a;
    return littleEndian || bigEndian;
  }
  return false;
}

export function validateDocumentContent(
  document: DocumentRecord,
  mediaType: string,
  content: unknown,
): { content: Buffer; sha256: string } {
  if (!Buffer.isBuffer(content) || content.length === 0) throw new Error('DOCUMENT_CONTENT_REQUIRED');
  if (content.length > MAX_DOCUMENT_SIZE_BYTES) throw new Error('FILE_TOO_LARGE');
  if (mediaType !== document.mediaType) throw new Error('DOCUMENT_MEDIA_TYPE_MISMATCH');
  if (content.length !== document.sizeBytes) throw new Error('DOCUMENT_SIZE_MISMATCH');
  if (!hasSignature(mediaType, content)) throw new Error('DOCUMENT_SIGNATURE_MISMATCH');
  return {
    content,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

export class MemoryDocumentContentStore implements DocumentContentStore {
  private readonly objects = new Map<string, { metadata: DocumentContentMetadata; content: Buffer }>();

  async put(input: {
    workspaceId: string;
    documentId: string;
    mediaType: string;
    content: Buffer;
  }): Promise<DocumentContentMetadata> {
    const metadata: DocumentContentMetadata = {
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      mediaType: input.mediaType,
      sizeBytes: input.content.length,
      sha256: crypto.createHash('sha256').update(input.content).digest('hex'),
      uploadedAt: new Date().toISOString(),
    };
    this.objects.set(`${input.workspaceId}:${input.documentId}`, {
      metadata,
      content: Buffer.from(input.content),
    });
    return metadata;
  }

  async getMetadata(workspaceId: string, documentId: string): Promise<DocumentContentMetadata | undefined> {
    return this.objects.get(`${workspaceId}:${documentId}`)?.metadata;
  }

  async get(
    workspaceId: string,
    documentId: string,
  ): Promise<{ metadata: DocumentContentMetadata; content: Buffer } | undefined> {
    const stored = this.objects.get(`${workspaceId}:${documentId}`);
    return stored
      ? { metadata: stored.metadata, content: Buffer.from(stored.content) }
      : undefined;
  }

  async has(workspaceId: string, documentId: string): Promise<boolean> {
    return this.objects.has(`${workspaceId}:${documentId}`);
  }
}
