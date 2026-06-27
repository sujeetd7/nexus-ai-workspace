/**
 * @module GuardrailPolicy
 * @description Policy configuration schema for the AI Guardrails System.
 *
 * Policies define which guardrails are active and at what thresholds.
 * Supports per-tenant, per-role, and per-environment configurations.
 *
 * TODO: Implement policy loader (MongoDB / config service)
 * TODO: Add OPA (Open Policy Agent) integration for complex policy rules
 * TODO: Add policy hot-reload support
 */

// ---------------------------------------------------------------------------
// Policy Schema
// ---------------------------------------------------------------------------

export type PolicyEnvironment = "production" | "staging" | "development" | "test";

export interface GuardrailPolicyEntry {
  /** Whether this guardrail is active in this policy */
  enabled: boolean;
  /** Guardrail-specific configuration overrides */
  config: Record<string, unknown>;
}

/**
 * A complete guardrail policy definition.
 *
 * Policies are loaded at startup and applied to every request.
 * Tenant-specific policies override the global default policy.
 */
export interface GuardrailPolicy {
  /** Unique policy identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of this policy's intent */
  description?: string;

  /** null = global default; string = applies to specific tenant */
  tenantId?: string;

  /** Environment this policy applies to */
  environment: PolicyEnvironment;

  /** Whether this policy is currently active */
  active: boolean;

  /** Version number for rollback support */
  version: number;

  /** Per-guardrail configuration */
  guardrails: Record<string, GuardrailPolicyEntry>;

  /** ISO timestamp when this policy was created */
  createdAt: string;

  /** ISO timestamp when this policy was last updated */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Policy Loader Interface
// ---------------------------------------------------------------------------

/**
 * Loads and caches guardrail policies.
 *
 * TODO: Implement DatabasePolicyLoader (MongoDB)
 * TODO: Implement FilePolicyLoader (JSON config files)
 * TODO: Implement CachedPolicyLoader (in-memory cache with TTL)
 */
export interface GuardrailPolicyLoader {
  /**
   * Load the effective policy for a given context.
   * Returns tenant-specific policy if available, falls back to global default.
   */
  loadPolicy(options: {
    tenantId?: string;
    environment: PolicyEnvironment;
  }): Promise<GuardrailPolicy>;

  /**
   * List all available policies.
   */
  listPolicies(): Promise<GuardrailPolicy[]>;

  /**
   * Reload policies from source (for hot-reload support).
   */
  reload(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default Policy Constant
// ---------------------------------------------------------------------------

/**
 * Hardcoded default policy for development/fallback.
 *
 * In production, load policies from the database.
 */
export const DEFAULT_POLICY: GuardrailPolicy = {
  id: "policy-default-development",
  name: "Default Development Policy",
  description: "Permissive policy for local development",
  environment: "development",
  active: true,
  version: 1,
  guardrails: {
    GUARDRAIL_PROMPT_INJECTION: {
      enabled: true,
      config: { blockThreshold: 0.9, scanHistory: false },
    },
    GUARDRAIL_JAILBREAK: {
      enabled: true,
      config: {},
    },
    GUARDRAIL_PII: {
      enabled: true,
      config: { mode: "MASK", confidenceThreshold: 0.85 },
    },
    GUARDRAIL_CONTENT_MODERATION: {
      enabled: false, // Disabled in dev to avoid API costs
      config: { flagThreshold: 0.9, blockOnFlag: false },
    },
    GUARDRAIL_RESPONSE_VALIDATION: {
      enabled: true,
      config: { maxLengthChars: 100_000, stripHtml: true, validateJson: false },
    },
  },
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

export const PRODUCTION_POLICY: Partial<GuardrailPolicy> = {
  id: "policy-default-production",
  name: "Default Production Policy",
  description: "Strict policy for production environments",
  environment: "production",
  active: true,
  version: 1,
  guardrails: {
    GUARDRAIL_PROMPT_INJECTION: {
      enabled: true,
      config: { blockThreshold: 0.8, scanHistory: true },
    },
    GUARDRAIL_JAILBREAK: {
      enabled: true,
      config: {},
    },
    GUARDRAIL_PII: {
      enabled: true,
      config: { mode: "MASK", confidenceThreshold: 0.8 },
    },
    GUARDRAIL_CONTENT_MODERATION: {
      enabled: true,
      config: { flagThreshold: 0.8, blockOnFlag: true },
    },
    GUARDRAIL_RESPONSE_VALIDATION: {
      enabled: true,
      config: { maxLengthChars: 100_000, stripHtml: true, validateJson: false },
    },
  },
};
