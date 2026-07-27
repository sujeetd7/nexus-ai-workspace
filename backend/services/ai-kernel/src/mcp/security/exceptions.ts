import {
  SecurityRole,
  PermissionAction,
  ResourceType,
  Permission,
} from "./types";

export class MCPAuthorizationException extends Error {
  public readonly code = "MCP_AUTHORIZATION_FAILED";
  public readonly userId: string;
  public readonly workspaceId: string;
  public readonly resource: ResourceType;
  public readonly action: PermissionAction;
  public readonly resourceId?: string;
  public readonly requiredPermissions: Permission[];

  constructor(
    userId: string,
    workspaceId: string,
    resource: ResourceType,
    action: PermissionAction,
    requiredPermissions: Permission[] = [],
    resourceId?: string,
    reason?: string,
  ) {
    const baseMessage = `Authorization failed for user ${userId} in workspace ${workspaceId}`;
    const actionMessage = `to ${action} ${resource}${resourceId ? ` '${resourceId}'` : ""}`;
    const fullMessage = reason
      ? `${baseMessage} ${actionMessage}: ${reason}`
      : `${baseMessage} ${actionMessage}`;

    super(fullMessage);
    this.name = "MCPAuthorizationException";
    this.userId = userId;
    this.workspaceId = workspaceId;
    this.resource = resource;
    this.action = action;
    this.resourceId = resourceId;
    this.requiredPermissions = requiredPermissions;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPAuthorizationException);
    }
  }
}

export class MCPAuthenticationException extends Error {
  public readonly code = "MCP_AUTHENTICATION_FAILED";
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly authMethod?: string;

  constructor(
    message: string,
    userId?: string,
    sessionId?: string,
    authMethod?: string,
  ) {
    super(`Authentication failed: ${message}`);
    this.name = "MCPAuthenticationException";
    this.userId = userId;
    this.sessionId = sessionId;
    this.authMethod = authMethod;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPAuthenticationException);
    }
  }
}

export class WorkspaceIsolationException extends Error {
  public readonly code = "WORKSPACE_ISOLATION_VIOLATED";
  public readonly userId: string;
  public readonly sourceWorkspaceId: string;
  public readonly targetWorkspaceId: string;
  public readonly resource: ResourceType;
  public readonly resourceId?: string;

  constructor(
    userId: string,
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    resource: ResourceType,
    resourceId?: string,
  ) {
    const message =
      `Workspace isolation violated: User ${userId} from workspace ${sourceWorkspaceId} ` +
      `attempted to access ${resource}${resourceId ? ` '${resourceId}'` : ""} in workspace ${targetWorkspaceId}`;

    super(message);
    this.name = "WorkspaceIsolationException";
    this.userId = userId;
    this.sourceWorkspaceId = sourceWorkspaceId;
    this.targetWorkspaceId = targetWorkspaceId;
    this.resource = resource;
    this.resourceId = resourceId;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkspaceIsolationException);
    }
  }
}

export class PermissionDeniedException extends Error {
  public readonly code = "PERMISSION_DENIED";
  public readonly userId: string;
  public readonly workspaceId: string;
  public readonly requiredPermission: Permission;
  public readonly userRoles: SecurityRole[];
  public readonly userPermissions: Permission[];

  constructor(
    userId: string,
    workspaceId: string,
    requiredPermission: Permission,
    userRoles: SecurityRole[] = [],
    userPermissions: Permission[] = [],
  ) {
    const message =
      `Permission denied for user ${userId} in workspace ${workspaceId}: ` +
      `Required permission ${requiredPermission.action} on ${requiredPermission.resource}` +
      `${requiredPermission.resourceId ? ` '${requiredPermission.resourceId}'` : ""}`;

    super(message);
    this.name = "PermissionDeniedException";
    this.userId = userId;
    this.workspaceId = workspaceId;
    this.requiredPermission = requiredPermission;
    this.userRoles = userRoles;
    this.userPermissions = userPermissions;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionDeniedException);
    }
  }
}
