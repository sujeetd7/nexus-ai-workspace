export enum SecurityRole {
  ADMIN = "admin",
  USER = "user",
  VIEWER = "viewer",
  SERVICE = "service"
}

export enum PermissionAction {
  READ = "read",
  WRITE = "write",
  EXECUTE = "execute",
  DELETE = "delete",
  CREATE = "create",
  UPDATE = "update"
}

export enum ResourceType {
  TOOL = "tool",
  PROMPT = "prompt",
  RESOURCE = "resource", 
  TEMPLATE = "template",
  SERVER = "server",
  WORKSPACE = "workspace"
}

export interface Permission {
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: string;
  conditions?: Record<string, unknown>;
}

export interface SecurityContext {
  userId: string;
  workspaceId: string;
  sessionId: string;
  serverId: string;
  roles: SecurityRole[];
  permissions: Permission[];
  metadata?: {
    timestamp: Date;
    source: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface AuthorizationRequest {
  context: SecurityContext;
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  grantedBy?: {
    role?: SecurityRole;
    permission?: Permission;
  };
  metadata: {
    checkedAt: Date;
    duration: number;
    cached: boolean;
  };
}

export interface WorkspacePermissions {
  workspaceId: string;
  userId: string;
  roles: SecurityRole[];
  permissions: Permission[];
  inherit: boolean;
  expiresAt?: Date;
}

export interface UserPermissions {
  userId: string;
  globalRoles: SecurityRole[];
  globalPermissions: Permission[];
  workspacePermissions: Map<string, WorkspacePermissions>;
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

export interface ToolPermissions {
  toolName: string;
  serverId: string;
  allowedRoles: SecurityRole[];
  requiredPermissions: Permission[];
  restrictions?: {
    maxExecutionsPerHour?: number;
    allowedWorkspaces?: string[];
    blockedUsers?: string[];
  };
}

export interface ServerPermissions {
  serverId: string;
  allowedRoles: SecurityRole[];
  requiredPermissions: Permission[];
  workspaceRestrictions?: string[];
  userRestrictions?: string[];
  connectionLimits?: {
    maxConcurrentSessions: number;
    maxSessionsPerUser: number;
  };
}

export interface PermissionCacheEntry {
  key: string;
  result: AuthorizationResult;
  context: SecurityContext;
  cachedAt: Date;
  expiresAt: Date;
  ttl: number;
}

export enum SecurityEvent {
  AUTHORIZED = "security:authorized",
  DENIED = "security:denied",
  PERMISSION_UPDATED = "security:permission_updated",
  AUTHENTICATION_FAILED = "security:authentication_failed",
  WORKSPACE_ISOLATION_VIOLATED = "security:workspace_isolation_violated"
}

export interface SecurityEventPayload {
  userId: string;
  workspaceId: string;
  sessionId?: string;
  serverId?: string;
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: string;
  granted: boolean;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SecurityConfig {
  cacheTtl?: number;
  maxCacheSize?: number;
  enableWorkspaceIsolation?: boolean;
  strictPermissionChecking?: boolean;
  defaultRoles?: SecurityRole[];
  sessionTimeout?: number;
}