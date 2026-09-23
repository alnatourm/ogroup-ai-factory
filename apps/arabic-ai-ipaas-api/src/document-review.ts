import crypto from 'node:crypto';
import { parseStructuredInvoice, type StructuredInvoice } from './structured-invoice.js';
import type { DocumentRecord, DocumentReviewRecord } from './types.js';

export function parseReviewInvoice(value: unknown): StructuredInvoice {
  try {
    return parseStructuredInvoice(value);
  } catch {
    throw new Error('INVALID_INVOICE_REVIEW');
  }
}

export function requireApprovableInvoice(invoice: StructuredInvoice): void {
  if (invoice.validationWarnings.length > 0) {
    throw new Error('INVOICE_REVIEW_VALIDATION_REQUIRED');
  }
}

export function createApprovalDigest(input: {
  documentId: string;
  extractionId: string;
  invoice: StructuredInvoice;
}): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      schemaVersion: 'verified-invoice-json-v1',
      documentId: input.documentId,
      extractionId: input.extractionId,
      invoice: input.invoice,
    }))
    .digest('hex');
}

export function createVerifiedInvoiceExport(
  document: DocumentRecord,
  review: DocumentReviewRecord,
) {
  if (review.status !== 'approved' || !review.approvalDigest) {
    throw new Error('DOCUMENT_REVIEW_NOT_APPROVED');
  }
  return {
    schemaVersion: 'verified-invoice-json-v1' as const,
    document: {
      id: document.id,
      filename: document.filename,
      mediaType: document.mediaType,
      sha256: document.sha256 ?? null,
    },
    sourceExtractionId: review.extractionId,
    approval: {
      status: review.status,
      approvedBy: review.reviewedBy,
      approvedAt: review.createdAt,
      sha256: review.approvalDigest,
    },
    invoice: review.reviewedJson,
  };
}
