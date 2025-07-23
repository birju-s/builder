/**
 * Integration System Types
 * 
 * This file defines the type system for the third-party integration framework.
 * It includes types for auth providers, payment systems, and other integrations.
 */

/**
 * Available integration categories
 */
export type IntegrationType = 'auth' | 'payment' | 'database' | 'email' | 'analytics' | 'storage';

/**
 * Main integration provider definition
 */
export interface IntegrationProvider {
  id: string;
  name: string;
  type: IntegrationType;
  description: string;
  icon: string;
  website: string;
  
  // Configuration schema
  configSchema: IntegrationConfigField[];
  
  // Required environment variables
  envVars: {
    key: string;
    description: string;
    required: boolean;
    sensitive: boolean; // Should be encrypted
  }[];
  
  // Code templates and components
  templates: {
    setup: string; // Initial setup code
    components: IntegrationComponent[];
    hooks: IntegrationHook[];
    utils: IntegrationUtil[];
  };
  
  // Documentation
  docs: {
    quickStart: string;
    examples: string[];
    troubleshooting: string;
  };
  
  // Pricing info (optional)
  pricing?: {
    freeTier: boolean;
    paidPlans: string;
  };
  
  // Package dependencies
  dependencies: {
    npm: string[];
    types?: string[];
  };
}

/**
 * Configuration field definition for integration setup
 */
export interface IntegrationConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean' | 'url' | 'json';
  description: string;
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Reusable component provided by an integration
 */
export interface IntegrationComponent {
  name: string;
  description: string;
  category: 'auth' | 'payment' | 'form' | 'ui';
  code: string;
  props: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    defaultValue?: any;
  }[];
  examples: string[];
}

/**
 * Custom hook provided by an integration
 */
export interface IntegrationHook {
  name: string;
  description: string;
  code: string;
  params: {
    name: string;
    type: string;
    description: string;
  }[];
  returns: string;
  examples: string[];
}

/**
 * Utility function provided by an integration
 */
export interface IntegrationUtil {
  name: string;
  description: string;
  code: string;
  examples: string[];
}

/**
 * Project-specific integration instance
 */
export interface ProjectIntegration {
  id: string;
  projectId: string;
  providerId: string;
  config: Record<string, any>;
  envVars: Record<string, string>; // Encrypted values
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tracks where integrations are used within a project
 */
export interface IntegrationUsage {
  integrationId: string;
  componentName: string;
  filePath: string;
  lineNumber?: number;
}
