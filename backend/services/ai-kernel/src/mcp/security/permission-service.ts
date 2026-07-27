import { EventEmitter } from "events";
import { PermissionCache } from "./permission-cache";
import {
  SecurityContext,
  AuthorizationRequest,
  AuthorizationResult,
  WorkspacePermissions,
  UserPermissions,
  ToolPermissions,
  ServerPermissions,
  Permission,
  SecurityRole,
  ResourceType,
  PermissionAction,
  SecurityConfig,
  SecurityEvent,
  SecurityEventPayload,
} from "./types";
import {
  MCPAuthorizationException,
  WorkspaceIsolationException,
  PermissionDeniedException,
} from "./exceptions";

export class PermissionService extends EventEmitter {
  private cache: PermissionCache;
  private config: Required<SecurityConfig>;
  private workspacePermissions = new Map<string, WorkspacePermissions>();
  private userPermissions = new Map<string, UserPermissions>();
  private toolPermissions = new Map<string, ToolPermissions>();
  private serverPermissions = new Map<string, ServerPermissions>();

  constructor(config: SecurityConfig = {}) {
    super();
    this.config = {
      cacheTtl: config.cacheTtl ?? 300000,
      maxCacheSize: config.maxCacheSize ?? 10000,
      enableWorkspaceIsolation: config.enableWorkspaceIsolation ?? true,
      strictPermissionChecking: config.strictPermissionChecking ?? true,
      defaultRoles: config.defaultRoles ?? [SecurityRole.USER],
      sessionTimeout: config.sessionTimeout ?? 3600000,
    };

    this.cache = new PermissionCache(
      this.config.cacheTtl,
      this.config.maxCacheSize,
    );
    this.setupCacheEvents();
  }

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.cache.generateCacheKey(
      request.context.userId,
      request.context.workspaceId,
      request.resource,
      request.action,
      request.resourceId,
      request.context.serverId,
    );

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform workspace isolation check
    if (this.config.enableWorkspaceIsolation) {
      this.enforceWorkspaceIsolation(request);
    }

    // Perform authorization check
    const result = await this.performAuthorization(request, startTime);

    // Cache the result
    this.cache.set(cacheKey, result, request.context, this.config.cacheTtl);

    // Emit event
    this.emitSecurityEvent(request, result);

    return result;
  }

  setWorkspacePermissions(
    workspaceId: string,
    permissions: WorkspacePermissions,
  ): void {
    this.workspacePermissions.set(workspaceId, permissions);
    this.cache.invalidateWorkspace(workspaceId);
    this.emitPermissionUpdated("workspace", workspaceId);
  }

  setUserPermissions(userId: string, permissions: UserPermissions): void {
    this.userPermissions.set(userId, permissions);
    this.cache.invalidateUser(userId);
    this.emitPermissionUpdated("user", userId);
  }

  setToolPermissions(toolKey: string, permissions: ToolPermissions): void {
    this.toolPermissions.set(toolKey, permissions);
    // Invalidate all cache entries for this server (since tool permissions changed)
    this.cache.invalidateServer(permissions.serverId);
    this.emitPermissionUpdated("tool", toolKey);
  }

  setServerPermissions(serverId: string, permissions: ServerPermissions): void {
    this.serverPermissions.set(serverId, permissions);
    this.cache.invalidateServer(serverId);
    this.emitPermissionUpdated("server", serverId);
  }

  getWorkspacePermissions(workspaceId: string): WorkspacePermissions | null {
    return this.workspacePermissions.get(workspaceId) || null;
  }

  getUserPermissions(userId: string): UserPermissions | null {
    return this.userPermissions.get(userId) || null;
  }

  getToolPermissions(toolKey: string): ToolPermissions | null {
    return this.toolPermissions.get(toolKey) || null;
  }

  getServerPermissions(serverId: string): ServerPermissions | null {
    return this.serverPermissions.get(serverId) || null;
  }

  invalidateCache(
    userId?: string,
    workspaceId?: string,
    serverId?: string,
  ): void {
    if (userId) {
      this.cache.invalidateUser(userId);
    } else if (workspaceId) {
      this.cache.invalidateWorkspace(workspaceId);
    } else if (serverId) {
      this.cache.invalidateServer(serverId);
    } else {
      this.cache.clear();
    }
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  private enforceWorkspaceIsolation(request: AuthorizationRequest): void {
    const { context, resource, resourceId } = request;

    // Check if the request is trying to access resources from a different workspace
    if (
      resource === ResourceType.WORKSPACE &&
      resourceId &&
      resourceId !== context.workspaceId
    ) {
      throw new WorkspaceIsolationException(
        context.userId,
        context.workspaceId,
        resourceId,
        resource,
        resourceId,
      );
    }

    // For other resources, ensure they belong to the current workspace
    // This would typically involve checking resource metadata or database lookups
    // For now, we assume all resources are workspace-scoped
  }

  private async performAuthorization(
    request: AuthorizationRequest,
    startTime: number,
  ): Promise<AuthorizationResult> {
    const { context, resource, action, resourceId } = request;

    try {
      // Get user permissions
      const userPerms = this.getUserEffectivePermissions(context);

      // Get resource-specific permissions
      const resourcePerms = this.getResourcePermissions(
        resource,
        resourceId,
        context.serverId,
      );

      // Check if user has required role-based access
      const roleAccess = this.checkRoleBasedAccess(
        userPerms.roles,
        resourcePerms,
      );

      // Check if user has explicit permission
      const permissionAccess = this.checkPermissionBasedAccess(
        userPerms.permissions,
        resource,
        action,
        resourceId,
      );

      const granted = roleAccess || permissionAccess;
      const grantedBy = roleAccess
        ? {
            role: userPerms.roles.find((role) =>
              resourcePerms.allowedRoles.includes(role),
            ),
          }
        : {
            permission: userPerms.permissions.find(
              (p) =>
                p.resource === resource &&
                p.action === action &&
                (!p.resourceId || p.resourceId === resourceId),
            ),
          };

      const result: AuthorizationResult = {
        granted,
        reason: granted ? "Access granted" : "Insufficient permissions",
        requiredPermissions: granted
          ? []
          : this.getRequiredPermissions(resource, action, resourceId),
        grantedBy: granted ? grantedBy : undefined,
        metadata: {
          checkedAt: new Date(),
          duration: Date.now() - startTime,
          cached: false,
        },
      };

      return result;
    } catch (error) {
      throw new MCPAuthorizationException(
        context.userId,
        context.workspaceId,
        resource,
        action,
        this.getRequiredPermissions(resource, action, resourceId),
        resourceId,
        error instanceof Error ? error.message : "Authorization check failed",
      );
    }
  }

  private getUserEffectivePermissions(context: SecurityContext): {
    roles: SecurityRole[];
    permissions: Permission[];
  } {
    const userPerms = this.getUserPermissions(context.userId);
    const workspacePerms = this.getWorkspacePermissions(context.workspaceId);

    let roles = [...this.config.defaultRoles];
    let permissions: Permission[] = [];

    // Add user global roles and permissions
    if (userPerms) {
      roles.push(...userPerms.globalRoles);
      permissions.push(...userPerms.globalPermissions);

      // Add workspace-specific permissions
      const userWorkspacePerms = userPerms.workspacePermissions.get(
        context.workspaceId,
      );
      if (userWorkspacePerms) {
        roles.push(...userWorkspacePerms.roles);
        permissions.push(...userWorkspacePerms.permissions);
      }
    }

    // Add workspace default permissions
    if (workspacePerms && context.userId === workspacePerms.userId) {
      roles.push(...workspacePerms.roles);
      permissions.push(...workspacePerms.permissions);
    }

    // Remove duplicates
    roles = Array.from(new Set(roles));

    return { roles, permissions };
  }

  private getResourcePermissions(
    resource: ResourceType,
    resourceId?: string,
    serverId?: string,
  ): { allowedRoles: SecurityRole[]; requiredPermissions: Permission[] } {
    switch (resource) {
      case ResourceType.TOOL:
        if (resourceId && serverId) {
          const toolKey = `${serverId}:${resourceId}`;
          const toolPerms = this.getToolPermissions(toolKey);
          if (toolPerms) {
            return {
              allowedRoles: toolPerms.allowedRoles,
              requiredPermissions: toolPerms.requiredPermissions,
            };
          }
        }
        break;

      case ResourceType.SERVER:
        if (serverId) {
          const serverPerms = this.getServerPermissions(serverId);
          if (serverPerms) {
            return {
              allowedRoles: serverPerms.allowedRoles,
              requiredPermissions: serverPerms.requiredPermissions,
            };
          }
        }
        break;
    }

    // Default permissions for resources without specific configuration
    return {
      allowedRoles: [SecurityRole.ADMIN, SecurityRole.USER],
      requiredPermissions: [],
    };
  }

  private checkRoleBasedAccess(
    userRoles: SecurityRole[],
    resourcePerms: any,
  ): boolean {
    return userRoles.some((role) => resourcePerms.allowedRoles.includes(role));
  }

  private checkPermissionBasedAccess(
    userPermissions: Permission[],
    resource: ResourceType,
    action: PermissionAction,
    resourceId?: string,
  ): boolean {
    return userPermissions.some((permission) => {
      if (permission.resource !== resource || permission.action !== action) {
        return false;
      }

      // If permission has no resourceId, it applies to all resources of this type
      if (!permission.resourceId) {
        return true;
      }

      // If resourceId matches or no specific resourceId required
      return permission.resourceId === resourceId;
    });
  }

  private getRequiredPermissions(
    resource: ResourceType,
    action: PermissionAction,
    resourceId?: string,
  ): Permission[] {
    return [
      {
        resource,
        action,
        resourceId,
      },
    ];
  }

  private setupCacheEvents(): void {
    this.cache.on("cache:updated", (payload) => {
      this.emit("cache:updated", payload);
    });

    this.cache.on("cache:invalidated", (payload) => {
      this.emit("cache:invalidated", payload);
    });
  }

  private emitSecurityEvent(
    request: AuthorizationRequest,
    result: AuthorizationResult,
  ): void {
    const payload: SecurityEventPayload = {
      userId: request.context.userId,
      workspaceId: request.context.workspaceId,
      sessionId: request.context.sessionId,
      serverId: request.context.serverId,
      resource: request.resource,
      action: request.action,
      resourceId: request.resourceId,
      granted: result.granted,
      reason: result.reason,
      timestamp: new Date(),
      metadata: request.metadata,
    };

    const event = result.granted
      ? SecurityEvent.AUTHORIZED
      : SecurityEvent.DENIED;
    this.emit(event, payload);
  }

  private emitPermissionUpdated(type: string, id: string): void {
    this.emit(SecurityEvent.PERMISSION_UPDATED, {
      type,
      id,
      timestamp: new Date(),
    });
  }
}
