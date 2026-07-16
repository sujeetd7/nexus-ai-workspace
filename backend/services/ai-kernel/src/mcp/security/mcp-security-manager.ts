import { EventEmitter } from "events";
import { PermissionService } from "./permission-service";
import {
  SecurityContext,
  AuthorizationRequest,
  AuthorizationResult,
  ResourceType,
  PermissionAction,
  SecurityConfig,
  SecurityEvent,
  SecurityEventPayload,
  WorkspacePermissions,
  UserPermissions,
  ToolPermissions,
  ServerPermissions
} from "./types";
import {
  MCPAuthorizationException,
  MCPAuthenticationException,
  WorkspaceIsolationException
} from "./exceptions";

export interface ConnectionAuthorizationRequest {
  userId: string;
  workspaceId: string;
  serverId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface ToolAuthorizationRequest {
  context: SecurityContext;
  toolName: string;
  parameters?: Record<string, unknown>;
}

export interface PromptAuthorizationRequest {
  context: SecurityContext;
  promptName: string;
  parameters?: Record<string, unknown>;
}

export interface ResourceAuthorizationRequest {
  context: SecurityContext;
  resourceUri: string;
  action: PermissionAction;
}

export interface TemplateAuthorizationRequest {
  context: SecurityContext;
  templateName: string;
  parameters?: Record<string, unknown>;
}

export class MCPSecurityManager extends EventEmitter {
  private permissionService: PermissionService;
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    super();
    this.config = config;
    this.permissionService = new PermissionService(config);
    this.setupEventForwarding();
  }

  async authorizeConnection(request: ConnectionAuthorizationRequest): Promise<AuthorizationResult> {
    const context: SecurityContext = {
      userId: request.userId,
      workspaceId: request.workspaceId,
      sessionId: request.sessionId,
      serverId: request.serverId,
      roles: [],
      permissions: [],
      metadata: {
        timestamp: new Date(),
        source: "connection_authorization",
        ...request.metadata
      }
    };

    const authRequest: AuthorizationRequest = {
      context,
      resource: ResourceType.SERVER,
      action: PermissionAction.READ,
      resourceId: request.serverId,
      metadata: request.metadata
    };

    try {
      const result = await this.permissionService.authorize(authRequest);
      
      if (!result.granted) {
        throw new MCPAuthorizationException(
          request.userId,
          request.workspaceId,
          ResourceType.SERVER,
          PermissionAction.READ,
          result.requiredPermissions || [],
          request.serverId,
          "Server connection not authorized"
        );
      }

      return result;
    } catch (error) {
      if (error instanceof MCPAuthorizationException) {
        throw error;
      }
      throw new MCPAuthenticationException(
        "Connection authorization failed",
        request.userId,
        request.sessionId,
        "server_connection"
      );
    }
  }

  async authorizeTool(request: ToolAuthorizationRequest): Promise<AuthorizationResult> {
    // Validate workspace isolation
    this.validateWorkspaceAccess(request.context);

    const authRequest: AuthorizationRequest = {
      context: request.context,
      resource: ResourceType.TOOL,
      action: PermissionAction.EXECUTE,
      resourceId: request.toolName,
      metadata: {
        toolParameters: request.parameters,
        authorizationType: "tool_execution"
      }
    };

    const result = await this.permissionService.authorize(authRequest);

    if (!result.granted) {
      throw new MCPAuthorizationException(
        request.context.userId,
        request.context.workspaceId,
        ResourceType.TOOL,
        PermissionAction.EXECUTE,
        result.requiredPermissions || [],
        request.toolName,
        "Tool execution not authorized"
      );
    }

    return result;
  }

  async authorizePrompt(request: PromptAuthorizationRequest): Promise<AuthorizationResult> {
    // Validate workspace isolation
    this.validateWorkspaceAccess(request.context);

    const authRequest: AuthorizationRequest = {
      context: request.context,
      resource: ResourceType.PROMPT,
      action: PermissionAction.READ,
      resourceId: request.promptName,
      metadata: {
        promptParameters: request.parameters,
        authorizationType: "prompt_access"
      }
    };

    const result = await this.permissionService.authorize(authRequest);

    if (!result.granted) {
      throw new MCPAuthorizationException(
        request.context.userId,
        request.context.workspaceId,
        ResourceType.PROMPT,
        PermissionAction.READ,
        result.requiredPermissions || [],
        request.promptName,
        "Prompt access not authorized"
      );
    }

    return result;
  }

  async authorizeResource(request: ResourceAuthorizationRequest): Promise<AuthorizationResult> {
    // Validate workspace isolation
    this.validateWorkspaceAccess(request.context);

    const authRequest: AuthorizationRequest = {
      context: request.context,
      resource: ResourceType.RESOURCE,
      action: request.action,
      resourceId: request.resourceUri,
      metadata: {
        authorizationType: "resource_access"
      }
    };

    const result = await this.permissionService.authorize(authRequest);

    if (!result.granted) {
      throw new MCPAuthorizationException(
        request.context.userId,
        request.context.workspaceId,
        ResourceType.RESOURCE,
        request.action,
        result.requiredPermissions || [],
        request.resourceUri,
        "Resource access not authorized"
      );
    }

    return result;
  }

  async authorizeTemplate(request: TemplateAuthorizationRequest): Promise<AuthorizationResult> {
    // Validate workspace isolation
    this.validateWorkspaceAccess(request.context);

    const authRequest: AuthorizationRequest = {
      context: request.context,
      resource: ResourceType.TEMPLATE,
      action: PermissionAction.READ,
      resourceId: request.templateName,
      metadata: {
        templateParameters: request.parameters,
        authorizationType: "template_access"
      }
    };

    const result = await this.permissionService.authorize(authRequest);

    if (!result.granted) {
      throw new MCPAuthorizationException(
        request.context.userId,
        request.context.workspaceId,
        ResourceType.TEMPLATE,
        PermissionAction.READ,
        result.requiredPermissions || [],
        request.templateName,
        "Template access not authorized"
      );
    }

    return result;
  }

  // Permission management methods
  setWorkspacePermissions(workspaceId: string, permissions: WorkspacePermissions): void {
    this.permissionService.setWorkspacePermissions(workspaceId, permissions);
  }

  setUserPermissions(userId: string, permissions: UserPermissions): void {
    this.permissionService.setUserPermissions(userId, permissions);
  }

  setToolPermissions(serverId: string, toolName: string, permissions: ToolPermissions): void {
    const toolKey = `${serverId}:${toolName}`;
    this.permissionService.setToolPermissions(toolKey, permissions);
  }

  setServerPermissions(serverId: string, permissions: ServerPermissions): void {
    this.permissionService.setServerPermissions(serverId, permissions);
  }

  // Cache management methods
  invalidateUserCache(userId: string): void {
    this.permissionService.invalidateCache(userId);
  }

  invalidateWorkspaceCache(workspaceId: string): void {
    this.permissionService.invalidateCache(undefined, workspaceId);
  }

  invalidateServerCache(serverId: string): void {
    this.permissionService.invalidateCache(undefined, undefined, serverId);
  }

  clearAllCache(): void {
    this.permissionService.invalidateCache();
  }

  // Utility methods
  createSecurityContext(
    userId: string,
    workspaceId: string,
    sessionId: string,
    serverId: string,
    metadata?: Record<string, unknown>
  ): SecurityContext {
    return {
      userId,
      workspaceId,
      sessionId,
      serverId,
      roles: [], // Will be populated during authorization
      permissions: [], // Will be populated during authorization
      metadata: {
        timestamp: new Date(),
        source: "security_manager",
        ...metadata
      }
    };
  }

  validateSecurityContext(context: SecurityContext): void {
    if (!context.userId) {
      throw new MCPAuthenticationException("Missing userId in security context");
    }
    if (!context.workspaceId) {
      throw new MCPAuthenticationException("Missing workspaceId in security context");
    }
    if (!context.sessionId) {
      throw new MCPAuthenticationException("Missing sessionId in security context");
    }
    if (!context.serverId) {
      throw new MCPAuthenticationException("Missing serverId in security context");
    }
  }

  getPermissionStats() {
    return this.permissionService.getCacheStats();
  }

  shutdown(): void {
    this.clearAllCache();
    this.removeAllListeners();
  }

  private validateWorkspaceAccess(context: SecurityContext): void {
    this.validateSecurityContext(context);

    // Additional workspace isolation checks could be added here
    // For example, checking if the user actually belongs to the workspace
    if (!context.workspaceId) {
      throw new WorkspaceIsolationException(
        context.userId,
        context.workspaceId,
        "unknown",
        ResourceType.WORKSPACE
      );
    }
  }

  private setupEventForwarding(): void {
    // Forward all security events from the permission service
    this.permissionService.on(SecurityEvent.AUTHORIZED, (payload: SecurityEventPayload) => {
      this.emit(SecurityEvent.AUTHORIZED, payload);
    });

    this.permissionService.on(SecurityEvent.DENIED, (payload: SecurityEventPayload) => {
      this.emit(SecurityEvent.DENIED, payload);
    });

    this.permissionService.on(SecurityEvent.PERMISSION_UPDATED, (payload) => {
      this.emit(SecurityEvent.PERMISSION_UPDATED, payload);
    });

    // Forward cache events
    this.permissionService.on("cache:updated", (payload) => {
      this.emit("cache:updated", payload);
    });

    this.permissionService.on("cache:invalidated", (payload) => {
      this.emit("cache:invalidated", payload);
    });
  }
}