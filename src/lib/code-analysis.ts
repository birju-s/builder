import { openai } from '@inngest/agent-kit';

export interface CodeIssue {
  type: 'performance' | 'security' | 'accessibility' | 'best-practice';
  severity: 'low' | 'medium' | 'high';
  file: string;
  line?: number;
  message: string;
  suggestion: string;
  fixable: boolean;
}

export interface DependencyRecommendation {
  action: 'add' | 'remove' | 'upgrade' | 'replace';
  package: string;
  version?: string;
  reason: string;
  alternative?: string;
}

export interface CodeAnalysis {
  issues: CodeIssue[];
  dependencies: DependencyRecommendation[];
  suggestions: string[];
  score: number; // 0-100 code quality score
}

/**
 * Analyze generated code for issues and improvements
 */
export async function analyzeCode(files: Record<string, string>): Promise<CodeAnalysis> {
  const codeFiles = Object.entries(files).filter(([path]) => 
    path.match(/\.(tsx?|jsx?|css|scss)$/)
  );

  if (codeFiles.length === 0) {
    return { issues: [], dependencies: [], suggestions: [], score: 100 };
  }

  // Create analysis prompt
  const analysisPrompt = `
You are a senior code reviewer. Analyze the following code files for:
1. Performance issues (unnecessary re-renders, inefficient algorithms, large bundles)
2. Security vulnerabilities (XSS, unsafe patterns, exposed secrets)
3. Accessibility problems (missing alt text, keyboard navigation, screen readers)
4. Best practices (code organization, naming, React patterns)
5. Missing or outdated dependencies
6. Opportunities for better libraries/packages

FILES TO ANALYZE:
${codeFiles.map(([path, content]) => `
=== ${path} ===
${content}
`).join('\n')}

Respond with a JSON object matching this TypeScript interface:
{
  "issues": Array<{
    "type": "performance" | "security" | "accessibility" | "best-practice",
    "severity": "low" | "medium" | "high",
    "file": string,
    "line"?: number,
    "message": string,
    "suggestion": string,
    "fixable": boolean
  }>,
  "dependencies": Array<{
    "action": "add" | "remove" | "upgrade" | "replace",
    "package": string,
    "version"?: string,
    "reason": string,
    "alternative"?: string
  }>,
  "suggestions": string[],
  "score": number
}

Focus on actionable, specific recommendations. Be constructive and educational.
`;

  try {
    const model = openai({ model: 'gpt-4' });
    const response = await model.generateText(analysisPrompt);
    
    // Parse the JSON response
    const analysisText = response.text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in analysis response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as CodeAnalysis;
    
    // Validate the response structure
    if (!analysis.issues || !analysis.dependencies || !analysis.suggestions) {
      throw new Error('Invalid analysis response structure');
    }

    return analysis;
  } catch (error) {
    console.error('Code analysis failed:', error);
    
    // Return basic static analysis as fallback
    return await staticCodeAnalysis(files);
  }
}

/**
 * Fallback static analysis when AI fails
 */
async function staticCodeAnalysis(files: Record<string, string>): Promise<CodeAnalysis> {
  const issues: CodeIssue[] = [];
  const dependencies: DependencyRecommendation[] = [];
  const suggestions: string[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    // Check for common issues
    if (content.includes('console.log')) {
      issues.push({
        type: 'best-practice',
        severity: 'low',
        file: filePath,
        message: 'Console.log statements found',
        suggestion: 'Remove console.log statements before production',
        fixable: true,
      });
    }

    if (content.includes('dangerouslySetInnerHTML')) {
      issues.push({
        type: 'security',
        severity: 'high',
        file: filePath,
        message: 'Potential XSS vulnerability',
        suggestion: 'Sanitize HTML content or use safer alternatives',
        fixable: false,
      });
    }

    if (content.includes('<img') && !content.includes('alt=')) {
      issues.push({
        type: 'accessibility',
        severity: 'medium',
        file: filePath,
        message: 'Images missing alt text',
        suggestion: 'Add alt attributes to all images for screen readers',
        fixable: true,
      });
    }

    // Check for missing dependencies
    if (content.includes('import') && content.includes('date-fns')) {
      dependencies.push({
        action: 'add',
        package: 'date-fns',
        version: '^2.29.0',
        reason: 'Date manipulation library detected in imports',
      });
    }

    if (content.includes('moment')) {
      dependencies.push({
        action: 'replace',
        package: 'moment',
        reason: 'Moment.js is deprecated and has large bundle size',
        alternative: 'date-fns',
      });
    }
  }

  // General suggestions
  if (Object.keys(files).some(path => path.includes('components/'))) {
    suggestions.push('Consider adding PropTypes or TypeScript interfaces for better type safety');
  }

  const score = Math.max(0, 100 - (issues.length * 10));

  return { issues, dependencies, suggestions, score };
}

/**
 * Auto-fix simple issues in code
 */
export function autoFixIssues(
  files: Record<string, string>, 
  issues: CodeIssue[]
): Record<string, string> {
  const fixedFiles = { ...files };
  
  issues.forEach(issue => {
    if (!issue.fixable) return;
    
    const content = fixedFiles[issue.file];
    if (!content) return;
    
    let fixedContent = content;
    
    switch (issue.type) {
      case 'best-practice':
        if (issue.message.includes('Console.log')) {
          fixedContent = fixedContent.replace(/console\.log\([^)]*\);?\n?/g, '');
        }
        break;
        
      case 'accessibility':
        if (issue.message.includes('alt text')) {
          fixedContent = fixedContent.replace(
            /<img([^>]*?)(?!alt=)([^>]*?)>/g,
            '<img$1 alt="Generated image"$2>'
          );
        }
        break;
    }
    
    if (fixedContent !== content) {
      fixedFiles[issue.file] = fixedContent;
    }
  });
  
  return fixedFiles;
}
