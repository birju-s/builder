import { IntegrationProvider } from './types';

// Auth providers
import { clerkIntegration } from './providers/auth/clerk';
// import { auth0Integration } from './providers/auth/auth0';
// import { firebaseAuthIntegration } from './providers/auth/firebase';
// import { supabaseAuthIntegration } from './providers/auth/supabase';

// Payment providers  
import { stripeIntegration } from './providers/payment/stripe';
// import { paypalIntegration } from './providers/payment/paypal';
// import { squareIntegration } from './providers/payment/square';

// Database providers (future)
// import { supabaseIntegration } from './providers/database/supabase';
// import { planetscaleIntegration } from './providers/database/planetscale';

// Email providers (future)
// import { resendIntegration } from './providers/email/resend';
// import { sendgridIntegration } from './providers/email/sendgrid';

/**
 * Global registry of all available integrations
 */
export const integrationRegistry: Record<string, IntegrationProvider> = {
  // Auth
  clerk: clerkIntegration,
  // auth0: auth0Integration,
  // firebase: firebaseAuthIntegration,
  // supabase: supabaseAuthIntegration,
  
  // Payment
  stripe: stripeIntegration,
  // paypal: paypalIntegration,
  // square: squareIntegration,
  
  // Database
  // supabase: supabaseIntegration,
  // planetscale: planetscaleIntegration,
  
  // Email
  // resend: resendIntegration,
  // sendgrid: sendgridIntegration,
};

/**
 * Get integration by ID
 */
export function getIntegration(id: string): IntegrationProvider | null {
  return integrationRegistry[id] || null;
}

/**
 * Get all integrations by type
 */
export function getIntegrationsByType(type: string): IntegrationProvider[] {
  return Object.values(integrationRegistry).filter(
    integration => integration.type === type
  );
}

/**
 * Get all available integrations
 */
export function getAllIntegrations(): IntegrationProvider[] {
  return Object.values(integrationRegistry);
}

/**
 * Search integrations by name or description
 */
export function searchIntegrations(query: string): IntegrationProvider[] {
  const lowercaseQuery = query.toLowerCase();
  return Object.values(integrationRegistry).filter(
    integration =>
      integration.name.toLowerCase().includes(lowercaseQuery) ||
      integration.description.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Get featured integrations (most popular)
 */
export function getFeaturedIntegrations(): IntegrationProvider[] {
  const featured = ['clerk', 'stripe', 'supabase', 'resend'];
  return featured
    .map(id => integrationRegistry[id])
    .filter(Boolean) as IntegrationProvider[];
}

/**
 * Validate integration configuration
 */
export function validateIntegrationConfig(
  integration: IntegrationProvider,
  config: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of integration.configSchema) {
    const value = config[field.key];
    
    // Check required fields
    if (field.required && (!value || value === '')) {
      errors.push(`${field.label} is required`);
      continue;
    }
    
    // Skip validation if field is not provided and not required
    if (!value) continue;
    
    // Validate pattern
    if (field.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors.push(`${field.label} format is invalid`);
      }
    }
    
    // Validate length
    if (field.validation?.minLength && typeof value === 'string') {
      if (value.length < field.validation.minLength) {
        errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
      }
    }
    
    if (field.validation?.maxLength && typeof value === 'string') {
      if (value.length > field.validation.maxLength) {
        errors.push(`${field.label} must be no more than ${field.validation.maxLength} characters`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate code for integration usage
 */
export function generateIntegrationCode(
  integration: IntegrationProvider,
  componentName: string,
  props: Record<string, any> = {}
): string {
  const component = integration.templates.components.find(
    c => c.name === componentName
  );
  
  if (!component) {
    throw new Error(`Component ${componentName} not found in ${integration.name}`);
  }
  
  const propsString = Object.entries(props)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}="${value}"`;
      } else if (typeof value === 'boolean') {
        return value ? key : '';
      } else {
        return `${key}={${JSON.stringify(value)}}`;
      }
    })
    .filter(Boolean)
    .join(' ');
  
  return `<${componentName}${propsString ? ` ${propsString}` : ''} />`;
}

/**
 * Generate environment variables template
 */
export function generateEnvTemplate(integrations: IntegrationProvider[]): string {
  const envVars: string[] = [];
  
  integrations.forEach(integration => {
    envVars.push(`# ${integration.name} Integration`);
    integration.envVars.forEach(envVar => {
      envVars.push(`${envVar.key}=${envVar.sensitive ? 'your_secret_key_here' : 'your_key_here'}`);
    });
    envVars.push('');
  });
  
  return envVars.join('\n');
}

/**
 * Generate dependencies list for package.json
 */
export function generateDependencies(integrations: IntegrationProvider[]): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  
  integrations.forEach(integration => {
    // Add main dependencies
    integration.dependencies.npm.forEach(pkg => {
      dependencies[pkg] = 'latest';
    });
    
    // Add type dependencies
    integration.dependencies.types?.forEach(pkg => {
      devDependencies[pkg] = 'latest';
    });
  });
  
  return { dependencies, devDependencies };
}
