import type { Pool } from 'pg';
import type {
  DocumentContentMetadata,
  DocumentContentStore,
} from './document-content-store.js';

export class PostgresDocumentContentStore implements DocumentContentStore {
  constructor(private readonly pool: Pool) {}

  async put(input: {
    workspaceId: string;
    documentId: string;
    mediaType: string;
    content: Buffer;
  }): Promise<DocumentContentMetadata> {
    const crypto = await import('node:crypto');
    const sha256 = crypto.createHash('sha256').update(input.content).digest('hex');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const document = await client.query<{ id: string }>(
        'select id from documents where workspace_id = $1 and id = $2 for update',
        [input.workspaceId, input.documentId],
      );
      if (!document.rows[0]) throw new Error('DOCUMENT_NOT_FOUND');

      const result = await client.query<{
        workspace_id: string;
        document_id: string;
        media_type: string;
        size_bytes: string | number;
        sha256: string;
        updated_at: Date;
      }>(
        `insert into document_objects
          (workspace_id, document_id, media_type, size_bytes, sha256, content)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (workspace_id, document_id) do update
           set media_type = excluded.media_type,
               size_bytes = excluded.size_bytes,
               sha256 = excluded.sha256,
               content = excluded.content,
               updated_at = now()
         returning workspace_id, document_id, media_type, size_bytes, sha256, updated_at`,
        [
          input.workspaceId,
          input.documentId,
          input.mediaType,
          input.content.length,
          sha256,
          input.content,
        ],
      );
      await client.query(
        'update documents set sha256 = $3 where workspace_id = $1 and id = $2',
        [input.workspaceId, input.documentId, sha256],
      );
      await client.query('commit');

      const row = result.rows[0];
      if (!row) throw new Error('DOCUMENT_CONTENT_STORE_FAILED');
      return {
        workspaceId: row.workspace_id,
        documentId: row.document_id,
        mediaType: row.media_type,
        sizeBytes: Number(row.size_bytes),
        sha256: row.sha256,
        uploadedAt: row.updated_at.toISOString(),
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMetadata(workspaceId: string, documentId: string): Promise<DocumentContentMetadata | undefined> {
    const result = await this.pool.query<{
      workspace_id: string;
      document_id: string;
      media_type: string;
      size_bytes: string | number;
      sha256: string;
      updated_at: Date;
    }>(
      `select workspace_id, document_id, media_type, size_bytes, sha256, updated_at
         from document_objects
        where workspace_id = $1 and document_id = $2
        limit 1`,
      [workspaceId, documentId],
    );
    const row = result.rows[0];
    return row
      ? {
          workspaceId: row.workspace_id,
          documentId: row.document_id,
          mediaType: row.media_type,
          sizeBytes: Number(row.size_bytes),
          sha256: row.sha256,
          uploadedAt: row.updated_at.toISOString(),
        }
      : undefined;
  }

  async has(workspaceId: string, documentId: string): Promise<boolean> {
    const result = await this.pool.query(
      'select 1 from document_objects where workspace_id = $1 and document_id = $2 limit 1',
      [workspaceId, documentId],
    );
    return Boolean(result.rows[0]);
  }
}
