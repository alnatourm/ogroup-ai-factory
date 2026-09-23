import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { MemoryAuditRepository } from './audit-service.js';

const ownerA = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'owner-a',
  'x-workspace-role': 'workspace_owner',
};

const ownerB = {
  'x-workspace-id': 'workspace-b',
  'x-user-id': 'owner-b',
  'x-workspace-role': 'workspace_owner',
};

const viewerA = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'viewer-a',
  'x-workspace-role': 'viewer',
};

const invoice = {
  supplierName: 'Original supplier',
  supplierTaxId: 'TAX-1',
  invoiceNumber: 'INV-1',
  invoiceDate: '2026-09-23',
  dueDate: null,
  currency: 'JOD',
  subtotal: '100.00',
  taxTotal: '16.00',
  grandTotal: '116.00',
  confidence: {
    supplierName: 0.91,
    supplierTaxId: 0.9,
    invoiceNumber: 0.95,
    invoiceDate: 0.9,
    dueDate: null,
    currency: 0.99,
    subtotal: 0.9,
    taxTotal: 0.9,
    grandTotal: 0.9,
  },
  lineItems: [{
    description: 'Service',
    quantity: '1',
    unitPrice: '100.00',
    taxAmount: '16.00',
    lineTotal: '116.00',
  }],
  validationWarnings: [],
  reviewRequired: false,
};

async function readyInvoiceApp() {
  const auditRepository = new MemoryAuditRepository();
  const app = createApp({
    masterKey: 'review-test-master-key',
    allowInsecureTestHeaders: true,
    auditRepository,
    documentOcrAdapter: {
      supports: () => true,
      extract: async () => ({
        engineVersion: 'test-ocr',
        markdown: '# Invoice',
        structuredJson: {
          schemaVersion: 'document-extraction-json-v2',
          textDirection: 'ltr',
          documentType: 'invoice',
          invoice,
          entities: [],
        },
        language: 'en',
        pageCount: 1,
      }),
    },
  });

  await request(app)
    .post('/v1/provider-connections')
    .set(ownerA)
    .send({
      providerType: 'gemini',
      name: 'Review OCR',
      apiKey: 'test-key',
      modelDefault: 'test-model',
      config: { documentOcrEnabled: true },
    })
    .expect(201);

  const pdf = Buffer.from('%PDF-invoice-review', 'ascii');
  const created = await request(app)
    .post('/v1/documents')
    .set(ownerA)
    .send({ filename: 'invoice.pdf', mediaType: 'application/pdf', sizeBytes: pdf.length })
    .expect(201);
  const documentId = created.body.data.id as string;

  await request(app)
    .put(`/v1/documents/${documentId}/content`)
    .set(ownerA)
    .set('Content-Type', 'application/pdf')
    .send(pdf)
    .expect(201);

  await request(app)
    .post(`/v1/documents/${documentId}/extractions`)
    .set(ownerA)
    .send({})
    .expect(200);

  return { app, auditRepository, documentId };
}

describe('document invoice human review', () => {
  it('saves corrections, approves, audits, and exports verified JSON', async () => {
    const { app, auditRepository, documentId } = await readyInvoiceApp();
    const corrected = { ...invoice, supplierName: 'Verified supplier' };

    await request(app)
      .put(`/v1/documents/${documentId}/review`)
      .set(viewerA)
      .send({ invoice: corrected })
      .expect(403);

    const saved = await request(app)
      .put(`/v1/documents/${documentId}/review`)
      .set(ownerA)
      .send({ invoice: corrected })
      .expect(200);
    expect(saved.body.data.status).toBe('draft');

    const blockedOtherTenant = await request(app)
      .get(`/v1/documents/${documentId}/verified-json`)
      .set(ownerB);
    expect(blockedOtherTenant.status).toBe(404);

    const approved = await request(app)
      .post(`/v1/documents/${documentId}/approve`)
      .set(ownerA)
      .send({})
      .expect(200);
    expect(approved.body.data.status).toBe('approved');
    expect(approved.body.data.approvalDigest).toMatch(/^[a-f0-9]{64}$/);

    const exported = await request(app)
      .get(`/v1/documents/${documentId}/verified-json`)
      .set(ownerA)
      .expect(200);
    expect(exported.body.schemaVersion).toBe('verified-invoice-json-v1');
    expect(exported.body.invoice.supplierName).toBe('Verified supplier');
    expect(exported.body.approval.sha256).toBe(approved.body.data.approvalDigest);
    expect(exported.headers['cache-control']).toBe('private, no-store');

    const actions = (await auditRepository.list('workspace-a')).map((event) => event.action);
    expect(actions).toContain('document.review_saved');
    expect(actions).toContain('document.review_approved');
    expect(actions).toContain('document.verified_json_exported');
    expect(JSON.stringify(await auditRepository.list('workspace-a'))).not.toContain('Verified supplier');
  });

  it('blocks approval while required validation warnings remain', async () => {
    const { app, documentId } = await readyInvoiceApp();
    const incomplete = {
      ...invoice,
      grandTotal: null,
      confidence: { ...invoice.confidence, grandTotal: null },
      validationWarnings: [],
    };

    const response = await request(app)
      .post(`/v1/documents/${documentId}/approve`)
      .set(ownerA)
      .send({ invoice: incomplete });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('INVOICE_REVIEW_VALIDATION_REQUIRED');
  });
});
