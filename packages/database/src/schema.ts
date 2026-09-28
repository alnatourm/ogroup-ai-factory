import { sql } from 'drizzle-orm';
import {
  foreignKey,
  pgTable,
  text,
  boolean,
  bigint,
  integer,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('users_email_unique').on(table.email),
  uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
}, (table) => [uniqueIndex('sessions_token_hash_unique').on(table.tokenHash)]);

export const accountTokens = pgTable('account_tokens', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email'),
  purpose: text('purpose').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('account_tokens_token_hash_unique').on(table.tokenHash)]);

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('memberships_tenant_user_unique').on(table.tenantId, table.userId),
  uniqueIndex('memberships_id_tenant_unique').on(table.id, table.tenantId),
]);

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('roles_tenant_name_unique').on(table.tenantId, table.name),
  uniqueIndex('roles_id_tenant_unique').on(table.id, table.tenantId),
]);

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull(),
}, (table) => [uniqueIndex('permissions_key_unique').on(table.key)]);

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('role_permissions_unique').on(table.roleId, table.permissionId),
]);

export const userRoles = pgTable('user_roles', {
  membershipId: uuid('membership_id').notNull(),
  roleId: uuid('role_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
}, (table) => [
  uniqueIndex('user_roles_unique').on(table.membershipId, table.roleId),
  foreignKey({
    columns: [table.membershipId, table.tenantId],
    foreignColumns: [memberships.id, memberships.tenantId],
    name: 'user_roles_membership_tenant_fk',
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.roleId, table.tenantId],
    foreignColumns: [roles.id, roles.tenantId],
    name: 'user_roles_role_tenant_fk',
  }).onDelete('cascade'),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => organizations.id, { onDelete: 'set null' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  metadataJson: text('metadata_json'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});

export const factoryProjects = pgTable('factory_projects', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  intent: text('intent').notNull(),
  mode: text('mode').notNull(),
  status: text('status').notNull().default('IDEA'),
  targetRepository: text('target_repository'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('factory_projects_tenant_id_unique').on(table.tenantId, table.id)]);

export const factoryProjectBrain = pgTable('factory_project_brain', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull(),
  section: text('section').notNull(),
  contentJson: text('content_json').notNull().default('{}'),
  version: integer('version').notNull().default(1),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('factory_project_brain_tenant_project_section_unique').on(table.tenantId, table.projectId, table.section)]);

export const factoryAgents = pgTable('factory_agents', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), kind: text('kind').notNull(), endpointRef: text('endpoint_ref'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('factory_agents_tenant_name_unique').on(table.tenantId, table.name)]);

export const factoryProviders = pgTable('factory_providers', {
  id: uuid('id').primaryKey(), tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), kind: text('kind').notNull(), credentialRef: text('credential_ref'), baseUrl: text('base_url'),
  enabled: boolean('enabled').notNull().default(true), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('factory_providers_tenant_name_unique').on(table.tenantId, table.name)]);

export const factoryModels = pgTable('factory_models', {
  id: uuid('id').primaryKey(), tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').notNull().references(() => factoryProviders.id, { onDelete: 'cascade' }),
  modelKey: text('model_key').notNull(), displayName: text('display_name').notNull(), capabilitiesJson: text('capabilities_json').notNull().default('[]'),
  enabled: boolean('enabled').notNull().default(true), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('factory_models_tenant_provider_model_unique').on(table.tenantId, table.providerId, table.modelKey)]);

export const factoryRoleAssignments = pgTable('factory_role_assignments', {
  id: uuid('id').primaryKey(), tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => factoryProjects.id, { onDelete: 'cascade' }), roleKey: text('role_key').notNull(),
  agentId: uuid('agent_id').notNull().references(() => factoryAgents.id, { onDelete: 'restrict' }),
  modelId: uuid('model_id').references(() => factoryModels.id, { onDelete: 'set null' }),
  fallbackModelId: uuid('fallback_model_id').references(() => factoryModels.id, { onDelete: 'set null' }),
  budgetLimitMicros: bigint('budget_limit_micros', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const factoryUsageEvents = pgTable('factory_usage_events', {
  id: uuid('id').primaryKey(), tenantId: uuid('tenant_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => factoryProjects.id, { onDelete: 'set null' }), source: text('source').notNull(),
  provider: text('provider'), model: text('model'), inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
  outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0), costMicros: bigint('cost_micros', { mode: 'number' }).notNull().default(0),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});
