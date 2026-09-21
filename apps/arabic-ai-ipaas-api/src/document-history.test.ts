import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { MemoryAuditRepository } from './audit-service.js';

const ownerA = {
  'x-workspace-id': 'workspace-a',
  'x-user-id': 'user-a',
  'x-workspace-role': 'workspace_owner',
};

const ownerB = {
  'x-workspace-id': 'workspace-b',
  'x-user-id': 'user-b',
  'x-workspace-role': 'workspace_owner',
};

describe('document history and secure download', () => {
  it('lists and downloads only authenticated workspace content without logging file bytes', async () => {
    const auditRepository = new MemoryAuditRepository();
    const app = createApp({
      masterKey: 'document-history-test-master-key',
      allowInsecureTestHeaders: true,
      auditRepository,
    });
    const content = Buffer.from('%PDF-1.7 customer-private-download-test');
    const registration = await request(app)
      .post('/v1/documents')
      .set(ownerA)
      .send({
        filename: 'فاتورة رقم 1.pdf',
        mediaType: 'application/pdf',
        sizeBytes: content.length,
      });
    expect(registration.status).toBe(201);
    const documentId = registration.body.data.id as string;

    const upload = await request(app)
      .put(`/v1/documents/${documentId}/content`)
      .set(ownerA)
      .set('Content-Type', 'application/pdf')
      .send(content);
    expect(upload.status).toBe(201);

    const history = await request(app).get('/v1/documents').set(ownerA);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].id).toBe(documentId);

    const detail = await request(app).get(`/v1/documents/${documentId}`).set(ownerA);
    expect(detail.status).toBe(200);
    expect(detail.body.data.document.filename).toBe('فاتورة رقم 1.pdf');
    expect(detail.body.data.extraction).toBeNull();

    const download = await request(app)
      .get(`/v1/documents/${documentId}/content`)
      .set(ownerA)
      .buffer(true);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');
    expect(download.headers['content-disposition']).toContain("filename*=UTF-8''");
    expect(download.headers['cache-control']).toBe('private, no-store');
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(download.body)).toEqual(content);

    const isolated = await request(app)
      .get(`/v1/documents/${documentId}/content`)
      .set(ownerB);
    expect(isolated.status).toBe(404);
    expect(isolated.body.error).toBe('DOCUMENT_NOT_FOUND');

    const auditJson = JSON.stringify(await auditRepository.list('workspace-a'));
    expect(auditJson).toContain('document.content_downloaded');
    expect(auditJson).not.toContain('customer-private-download-test');
  });
});
