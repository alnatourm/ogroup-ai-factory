import { sql } from 'drizzle-orm';
import {
  foreignKey,
  pgTable,
  text,
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
