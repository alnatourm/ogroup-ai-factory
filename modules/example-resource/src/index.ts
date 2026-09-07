export interface TenantOwnedResource {
  id: string;
  tenantId: string;
  name: string;
}

export interface TenantResourceStore {
  findById(id: string, tenantId: string): Promise<TenantOwnedResource | null>;
  list(tenantId: string): Promise<TenantOwnedResource[]>;
}

export class InMemoryTenantResourceStore implements TenantResourceStore {
  constructor(private readonly records: TenantOwnedResource[]) {}

  async findById(id: string, tenantId: string): Promise<TenantOwnedResource | null> {
    return this.records.find((record) => record.id === id && record.tenantId === tenantId) ?? null;
  }

  async list(tenantId: string): Promise<TenantOwnedResource[]> {
    return this.records.filter((record) => record.tenantId === tenantId);
  }
}
