export type Permission = string;

export interface RoleDefinition {
  name: string;
  permissions: readonly Permission[];
}

export interface AuthorizationContext {
  roles: readonly RoleDefinition[];
}

export function hasPermission(
  context: AuthorizationContext,
  permission: Permission,
): boolean {
  return context.roles.some((role) => role.permissions.includes(permission));
}

export function requirePermission(
  context: AuthorizationContext,
  permission: Permission,
): void {
  if (!hasPermission(context, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
