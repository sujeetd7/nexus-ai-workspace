// Re-export from Batch-1 registry (keep compatibility)
export { MCPRegistry, ServerInfo } from "./mcp-registry";

// New Batch-5 registry components
export { DuplicateToolException, ServerRegistrationException } from "./exceptions";
export { 
  MCPServerRegistry, 
  RegisteredServer, 
  ServerLookupResult 
} from "./mcp-server-registry";