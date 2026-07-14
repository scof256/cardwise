export const workspacePermissions = [
  "workspace:manage",
  "members:manage",
  "billing:manage",
  "cards:create",
  "cards:review:any",
  "cards:review:own",
  "directory:read",
  "directory:write:any",
  "directory:write:own",
  "duplicates:manage",
  "sharing:manage:any",
  "sharing:manage:own",
  "reports:read:any",
  "reports:read:own",
  "events:read",
  "events:create",
  "events:manage:any",
  "events:manage:own",
  "events:participants:manage",
  "events:submit:any",
  "events:submit:own",
  "events:analytics:any",
  "events:analytics:own",
  "events:promotion:purchase",
] as const;

export type WorkspacePermission = (typeof workspacePermissions)[number];
export type WorkspaceRole = "owner" | "admin" | "sales_manager" | "sales_rep" | "employee" | "viewer" | "billing_admin";

const rolePermissions: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: workspacePermissions,
  admin: workspacePermissions.filter((permission) => permission !== "billing:manage" && permission !== "events:promotion:purchase"),
  sales_manager: ["cards:create", "cards:review:any", "directory:read", "directory:write:any", "duplicates:manage", "sharing:manage:any", "reports:read:any", "events:read", "events:create", "events:manage:own", "events:participants:manage", "events:submit:any", "events:analytics:own"],
  sales_rep: ["cards:create", "cards:review:own", "directory:read", "directory:write:own", "sharing:manage:own", "reports:read:own", "events:read", "events:create", "events:manage:own", "events:submit:own", "events:analytics:own"],
  employee: ["cards:create", "cards:review:own", "directory:read", "directory:write:own", "sharing:manage:own", "events:read", "events:submit:own"],
  viewer: ["directory:read", "events:read"],
  billing_admin: ["billing:manage", "directory:read", "events:read", "events:promotion:purchase"],
};

export function roleHasPermission(role: string, permission: WorkspacePermission) {
  return (rolePermissions[role as WorkspaceRole] ?? []).includes(permission);
}
