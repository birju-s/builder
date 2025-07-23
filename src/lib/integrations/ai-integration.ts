import { IntegrationProvider, ProjectIntegration } from './types';
import { getIntegration, generateIntegrationCode } from './registry';

/**
 * Generate AI prompt context about available integrations
 */
export function generateIntegrationContext(
  projectIntegrations: ProjectIntegration[]
): string {
  if (projectIntegrations.length === 0) {
    return `
AVAILABLE INTEGRATIONS: None currently installed.
You can suggest installing integrations like Clerk (auth), Stripe (payments), etc.
`;
  }

  const contextSections = projectIntegrations.map(integration => {
    const provider = getIntegration(integration.providerId);
    if (!provider) return '';

    const components = provider.templates.components
      .map(c => `- ${c.name}: ${c.description}`)
      .join('\n');

    const hooks = provider.templates.hooks
      .map(h => `- ${h.name}: ${h.description}`)
      .join('\n');

    return `
## ${provider.name} Integration (${provider.type})
${provider.description}

### Available Components:
${components}

### Available Hooks:
${hooks}

### Usage Examples:
${provider.templates.components[0]?.examples?.join('\n') || 'No examples available'}
`;
  });

  return `
INSTALLED INTEGRATIONS:
The following integrations are available in this project:

${contextSections.join('\n')}

INTEGRATION USAGE GUIDELINES:
- When users request authentication features, use components from auth integrations
- When users request payment features, use components from payment integrations  
- Always use the exact component names and props as defined above
- Import statements will be automatically handled
- Environment variables are already configured for these integrations
`;
}

/**
 * Detect integration usage in user prompts and suggest components
 */
export function detectIntegrationNeeds(
  userPrompt: string,
  projectIntegrations: ProjectIntegration[]
): {
  suggestions: IntegrationComponentSuggestion[];
  missingIntegrations: string[];
} {
  const prompt = userPrompt.toLowerCase();
  const suggestions: IntegrationComponentSuggestion[] = [];
  const missingIntegrations: string[] = [];

  // Auth-related keywords
  const authKeywords = ['login', 'sign in', 'sign up', 'authentication', 'auth', 'user', 'profile', 'logout'];
  const hasAuthKeywords = authKeywords.some(keyword => prompt.includes(keyword));
  
  if (hasAuthKeywords) {
    const authIntegration = projectIntegrations.find(i => {
      const provider = getIntegration(i.providerId);
      return provider?.type === 'auth';
    });

    if (authIntegration) {
      const provider = getIntegration(authIntegration.providerId)!;
      
      if (prompt.includes('login') || prompt.includes('sign in')) {
        suggestions.push({
          type: 'component',
          integration: provider,
          componentName: 'SignInButton',
          reason: 'User requested login functionality',
          code: '<SignInButton />',
        });
      }
      
      if (prompt.includes('user') || prompt.includes('profile')) {
        suggestions.push({
          type: 'component',
          integration: provider,
          componentName: 'UserButton',
          reason: 'User requested user profile functionality',
          code: '<UserButton showName />',
        });
      }
      
      if (prompt.includes('protected') || prompt.includes('private')) {
        suggestions.push({
          type: 'component',
          integration: provider,
          componentName: 'ProtectedRoute',
          reason: 'User requested protected content',
          code: '<ProtectedRoute><YourContent /></ProtectedRoute>',
        });
      }
    } else {
      missingIntegrations.push('Authentication (try Clerk, Auth0, or Firebase Auth)');
    }
  }

  // Payment-related keywords
  const paymentKeywords = ['payment', 'checkout', 'buy', 'purchase', 'subscription', 'billing', 'stripe', 'paypal'];
  const hasPaymentKeywords = paymentKeywords.some(keyword => prompt.includes(keyword));
  
  if (hasPaymentKeywords) {
    const paymentIntegration = projectIntegrations.find(i => {
      const provider = getIntegration(i.providerId);
      return provider?.type === 'payment';
    });

    if (paymentIntegration) {
      const provider = getIntegration(paymentIntegration.providerId)!;
      
      if (prompt.includes('checkout') || prompt.includes('buy')) {
        suggestions.push({
          type: 'component',
          integration: provider,
          componentName: 'CheckoutButton',
          reason: 'User requested checkout functionality',
          code: '<CheckoutButton priceId="price_xxx">Buy Now</CheckoutButton>',
        });
      }
      
      if (prompt.includes('subscription')) {
        suggestions.push({
          type: 'component',
          integration: provider,
          componentName: 'SubscriptionButton',
          reason: 'User requested subscription functionality',
          code: '<SubscriptionButton plan={subscriptionPlan} />',
        });
      }
      
      if (prompt.includes('payment form')) {
        suggestions.push({
          type: 'component',
          integration: provider,
          componentName: 'PaymentForm',
          reason: 'User requested payment form',
          code: '<PaymentForm amount={2000} onSuccess={handleSuccess} />',
        });
      }
    } else {
      missingIntegrations.push('Payments (try Stripe, PayPal, or Square)');
    }
  }

  return { suggestions, missingIntegrations };
}

export interface IntegrationComponentSuggestion {
  type: 'component' | 'hook' | 'util';
  integration: IntegrationProvider;
  componentName: string;
  reason: string;
  code: string;
}

/**
 * Generate enhanced prompt with integration awareness
 */
export function enhancePromptWithIntegrations(
  basePrompt: string,
  userPrompt: string,
  projectIntegrations: ProjectIntegration[]
): string {
  const integrationContext = generateIntegrationContext(projectIntegrations);
  const { suggestions, missingIntegrations } = detectIntegrationNeeds(userPrompt, projectIntegrations);

  let enhancedPrompt = `${basePrompt}

${integrationContext}`;

  if (suggestions.length > 0) {
    enhancedPrompt += `

INTEGRATION SUGGESTIONS FOR THIS REQUEST:
${suggestions.map(s => `- Use ${s.componentName} from ${s.integration.name}: ${s.reason}`).join('\n')}

SUGGESTED CODE:
${suggestions.map(s => s.code).join('\n')}`;
  }

  if (missingIntegrations.length > 0) {
    enhancedPrompt += `

MISSING INTEGRATIONS DETECTED:
The user's request might benefit from these integrations:
${missingIntegrations.map(m => `- ${m}`).join('\n')}

Consider suggesting these integrations to the user.`;
  }

  return enhancedPrompt;
}

/**
 * Extract integration components from generated code
 */
export function extractIntegrationUsage(
  code: string,
  projectIntegrations: ProjectIntegration[]
): IntegrationUsage[] {
  const usages: IntegrationUsage[] = [];
  
  projectIntegrations.forEach(integration => {
    const provider = getIntegration(integration.providerId);
    if (!provider) return;

    provider.templates.components.forEach(component => {
      const regex = new RegExp(`<${component.name}[^>]*>`, 'g');
      const matches = code.match(regex);
      
      if (matches) {
        matches.forEach((match, index) => {
          // Find line number (approximate)
          const beforeMatch = code.substring(0, code.indexOf(match));
          const lineNumber = beforeMatch.split('\n').length;
          
          usages.push({
            integrationId: integration.id,
            componentName: component.name,
            filePath: 'generated-component', // This would be the actual file path
            lineNumber,
          });
        });
      }
    });
  });

  return usages;
}

export interface IntegrationUsage {
  integrationId: string;
  componentName: string;
  filePath: string;
  lineNumber?: number;
}

/**
 * Generate import statements for used integrations
 */
export function generateIntegrationImports(
  usages: IntegrationUsage[],
  projectIntegrations: ProjectIntegration[]
): string[] {
  const imports: string[] = [];
  const importMap = new Map<string, Set<string>>();

  usages.forEach(usage => {
    const integration = projectIntegrations.find(i => i.id === usage.integrationId);
    if (!integration) return;

    const provider = getIntegration(integration.providerId);
    if (!provider) return;

    const component = provider.templates.components.find(c => c.name === usage.componentName);
    if (!component) return;

    // Extract import path from component code
    const importMatch = component.code.match(/import.*from ['"]([^'"]+)['"]/);
    if (importMatch) {
      const importPath = importMatch[1];
      if (!importMap.has(importPath)) {
        importMap.set(importPath, new Set());
      }
      importMap.get(importPath)!.add(usage.componentName);
    }
  });

  importMap.forEach((components, path) => {
    const componentList = Array.from(components).join(', ');
    imports.push(`import { ${componentList} } from '${path}';`);
  });

  return imports;
}
