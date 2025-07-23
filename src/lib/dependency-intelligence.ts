import { openai } from '@inngest/agent-kit';

export interface PackageInfo {
  name: string;
  version: string;
  reason: string;
  category: 'ui' | 'utility' | 'state' | 'styling' | 'build' | 'testing' | 'other';
  alternatives?: string[];
  deprecated?: boolean;
  securityIssues?: boolean;
}

export interface DependencyAnalysis {
  missing: PackageInfo[];
  outdated: PackageInfo[];
  unnecessary: PackageInfo[];
  alternatives: Array<{
    current: string;
    suggested: string;
    reason: string;
    breaking: boolean;
  }>;
  conflicts: Array<{
    packages: string[];
    issue: string;
    resolution: string;
  }>;
}

/**
 * Analyze code and suggest optimal dependencies
 */
export async function analyzeDependencies(
  files: Record<string, string>,
  currentPackageJson?: any
): Promise<DependencyAnalysis> {
  const imports = extractImports(files);
  const usagePatterns = analyzeUsagePatterns(files);
  
  // Get current dependencies
  const currentDeps = currentPackageJson?.dependencies || {};
  const currentDevDeps = currentPackageJson?.devDependencies || {};
  const allCurrentDeps = { ...currentDeps, ...currentDevDeps };

  const analysis: DependencyAnalysis = {
    missing: [],
    outdated: [],
    unnecessary: [],
    alternatives: [],
    conflicts: [],
  };

  // Check for missing dependencies
  for (const importName of imports) {
    if (!allCurrentDeps[importName] && !isBuiltIn(importName)) {
      const packageInfo = await getPackageRecommendation(importName, usagePatterns);
      if (packageInfo) {
        analysis.missing.push(packageInfo);
      }
    }
  }

  // Check for better alternatives
  const alternativeChecks = [
    { current: 'moment', suggested: 'date-fns', reason: 'Smaller bundle size, tree-shakable', breaking: true },
    { current: 'lodash', suggested: 'lodash-es', reason: 'ES modules for better tree-shaking', breaking: false },
    { current: 'axios', suggested: 'ky', reason: 'Smaller, modern fetch-based HTTP client', breaking: true },
    { current: 'classnames', suggested: 'clsx', reason: 'Faster and smaller alternative', breaking: false },
    { current: 'uuid', suggested: 'nanoid', reason: 'Smaller size, URL-safe IDs', breaking: true },
  ];

  for (const check of alternativeChecks) {
    if (allCurrentDeps[check.current] && !allCurrentDeps[check.suggested]) {
      analysis.alternatives.push(check);
    }
  }

  // Check for unused dependencies (simplified)
  for (const [depName] of Object.entries(allCurrentDeps)) {
    if (!imports.includes(depName) && !isUtilityPackage(depName)) {
      analysis.unnecessary.push({
        name: depName,
        version: allCurrentDeps[depName],
        reason: 'Not found in import statements',
        category: 'other',
      });
    }
  }

  return analysis;
}

/**
 * Extract all imports from code files
 */
function extractImports(files: Record<string, string>): string[] {
  const imports = new Set<string>();
  
  for (const content of Object.values(files)) {
    // Match ES6 imports: import ... from 'package'
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const packageMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          // Extract package name (handle scoped packages and relative imports)
          if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
            const cleanName = packageName.startsWith('@') 
              ? packageName.split('/').slice(0, 2).join('/')
              : packageName.split('/')[0];
            imports.add(cleanName);
          }
        }
      });
    }
    
    // Match require statements: require('package')
    const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g);
    if (requireMatches) {
      requireMatches.forEach(match => {
        const packageMatch = match.match(/require\(['"]([^'"]+)['"]\)/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
            const cleanName = packageName.startsWith('@')
              ? packageName.split('/').slice(0, 2).join('/')
              : packageName.split('/')[0];
            imports.add(cleanName);
          }
        }
      });
    }
  }
  
  return Array.from(imports);
}

/**
 * Analyze how packages are being used to make better recommendations
 */
function analyzeUsagePatterns(files: Record<string, string>): Record<string, string[]> {
  const patterns: Record<string, string[]> = {};
  
  for (const [filePath, content] of Object.entries(files)) {
    // React patterns
    if (content.includes('useState') || content.includes('useEffect')) {
      patterns.react = patterns.react || [];
      patterns.react.push('hooks');
    }
    
    if (content.includes('styled-components') || content.includes('emotion')) {
      patterns.styling = patterns.styling || [];
      patterns.styling.push('css-in-js');
    }
    
    if (content.includes('tailwind') || content.includes('tw-')) {
      patterns.styling = patterns.styling || [];
      patterns.styling.push('tailwind');
    }
    
    // Date handling
    if (content.includes('new Date(') || content.includes('Date.now()')) {
      patterns.dates = patterns.dates || [];
      patterns.dates.push('native');
    }
    
    // HTTP requests
    if (content.includes('fetch(') || content.includes('.get(') || content.includes('.post(')) {
      patterns.http = patterns.http || [];
      patterns.http.push('requests');
    }
    
    // Form handling
    if (content.includes('onSubmit') || content.includes('form')) {
      patterns.forms = patterns.forms || [];
      patterns.forms.push('forms');
    }
  }
  
  return patterns;
}

/**
 * Get package recommendation based on import name and usage patterns
 */
async function getPackageRecommendation(
  importName: string,
  patterns: Record<string, string[]>
): Promise<PackageInfo | null> {
  // Common package mappings
  const knownPackages: Record<string, PackageInfo> = {
    'react': {
      name: 'react',
      version: '^18.0.0',
      reason: 'React library for UI components',
      category: 'ui',
    },
    'react-dom': {
      name: 'react-dom',
      version: '^18.0.0',
      reason: 'React DOM rendering',
      category: 'ui',
    },
    'date-fns': {
      name: 'date-fns',
      version: '^2.29.0',
      reason: 'Modern date utility library',
      category: 'utility',
      alternatives: ['dayjs', 'luxon'],
    },
    'clsx': {
      name: 'clsx',
      version: '^2.0.0',
      reason: 'Utility for constructing className strings',
      category: 'utility',
      alternatives: ['classnames'],
    },
    'framer-motion': {
      name: 'framer-motion',
      version: '^10.0.0',
      reason: 'Animation library for React',
      category: 'ui',
      alternatives: ['react-spring', 'react-transition-group'],
    },
    'zod': {
      name: 'zod',
      version: '^3.20.0',
      reason: 'TypeScript-first schema validation',
      category: 'utility',
      alternatives: ['yup', 'joi'],
    },
  };
  
  return knownPackages[importName] || null;
}

/**
 * Check if a package is a built-in Node.js module
 */
function isBuiltIn(packageName: string): boolean {
  const builtIns = [
    'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'querystring',
    'util', 'events', 'stream', 'buffer', 'child_process', 'cluster',
    'net', 'tls', 'dgram', 'dns', 'domain', 'repl', 'readline', 'vm',
    'zlib', 'assert', 'constants', 'punycode', 'string_decoder', 'sys',
    'timers', 'tty', 'worker_threads'
  ];
  
  return builtIns.includes(packageName);
}

/**
 * Check if a package is likely a utility/build tool that might not appear in imports
 */
function isUtilityPackage(packageName: string): boolean {
  const utilityPackages = [
    'typescript', 'eslint', 'prettier', 'jest', 'vitest', 'webpack',
    'rollup', 'vite', 'babel', 'postcss', 'tailwindcss', 'autoprefixer',
    '@types/', 'husky', 'lint-staged', 'cross-env', 'dotenv'
  ];
  
  return utilityPackages.some(util => packageName.includes(util));
}

/**
 * Generate updated package.json with recommendations
 */
export function generateUpdatedPackageJson(
  currentPackageJson: any,
  analysis: DependencyAnalysis
): any {
  const updated = JSON.parse(JSON.stringify(currentPackageJson));
  
  // Add missing dependencies
  if (!updated.dependencies) updated.dependencies = {};
  analysis.missing.forEach(pkg => {
    if (['ui', 'utility', 'state'].includes(pkg.category)) {
      updated.dependencies[pkg.name] = pkg.version;
    } else {
      if (!updated.devDependencies) updated.devDependencies = {};
      updated.devDependencies[pkg.name] = pkg.version;
    }
  });
  
  // Remove unnecessary dependencies (with caution)
  analysis.unnecessary.forEach(pkg => {
    if (updated.dependencies?.[pkg.name]) {
      delete updated.dependencies[pkg.name];
    }
    if (updated.devDependencies?.[pkg.name]) {
      delete updated.devDependencies[pkg.name];
    }
  });
  
  return updated;
}
