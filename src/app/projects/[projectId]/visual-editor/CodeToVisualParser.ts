import { VisualElement } from './VisualCanvas';

/**
 * Parse React JSX code into visual elements
 */
export function parseReactCode(code: string): VisualElement[] {
  // This is a simplified parser - in production you'd use a proper AST parser
  // like @babel/parser with JSX support
  
  const elements: VisualElement[] = [];
  
  try {
    // Extract JSX elements using regex patterns
    // This is a basic implementation - production would need proper AST parsing
    const jsxPattern = /<(\w+)([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
    let match;
    let elementId = 1;
    
    while ((match = jsxPattern.exec(code)) !== null) {
      const [fullMatch, tagName, attributesStr, children] = match;
      
      // Parse attributes
      const props: Record<string, any> = {};
      const style: React.CSSProperties = {};
      let className = '';
      
      if (attributesStr) {
        // Parse className
        const classMatch = attributesStr.match(/className=["']([^"']*)["']/);
        if (classMatch) {
          className = classMatch[1];
        }
        
        // Parse other attributes
        const attrPattern = /(\w+)=["']([^"']*)["']/g;
        let attrMatch;
        while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
          const [, attrName, attrValue] = attrMatch;
          if (attrName !== 'className') {
            props[attrName] = attrValue;
          }
        }
        
        // Parse inline styles
        const styleMatch = attributesStr.match(/style=\{([^}]*)\}/);
        if (styleMatch) {
          try {
            // This is very basic - would need proper parsing in production
            const styleObj = parseInlineStyles(styleMatch[1]);
            Object.assign(style, styleObj);
          } catch (error) {
            console.warn('Failed to parse inline styles:', error);
          }
        }
      }
      
      // Handle text content
      if (children && !children.includes('<')) {
        props.children = children.trim();
      }
      
      elements.push({
        id: `parsed-${elementId++}`,
        type: tagName.toLowerCase(),
        props,
        style,
        className,
        children: children && children.includes('<') ? parseReactCode(children) : undefined,
      });
    }
    
    return elements;
  } catch (error) {
    console.error('Failed to parse React code:', error);
    return [];
  }
}

/**
 * Parse inline style string into CSS properties object
 */
function parseInlineStyles(styleStr: string): React.CSSProperties {
  const style: React.CSSProperties = {};
  
  try {
    // Remove braces and split by semicolons or commas
    const cleaned = styleStr.replace(/[{}]/g, '');
    const declarations = cleaned.split(/[;,]/).filter(Boolean);
    
    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        // Convert kebab-case to camelCase
        const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        style[camelProperty as keyof React.CSSProperties] = value.replace(/['"]/g, '');
      }
    }
  } catch (error) {
    console.warn('Failed to parse inline styles:', error);
  }
  
  return style;
}

/**
 * Convert visual elements back to React JSX code
 */
export function visualToReactCode(elements: VisualElement[], indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);
  
  return elements.map(element => {
    const { type, props, style, className, children } = element;
    
    // Build attributes
    const attributes: string[] = [];
    
    // Add className if present
    if (className) {
      attributes.push(`className="${className}"`);
    }
    
    // Add other props
    Object.entries(props).forEach(([key, value]) => {
      if (key !== 'children') {
        if (typeof value === 'string') {
          attributes.push(`${key}="${value}"`);
        } else {
          attributes.push(`${key}={${JSON.stringify(value)}}`);
        }
      }
    });
    
    // Add inline styles
    if (style && Object.keys(style).length > 0) {
      const styleStr = Object.entries(style)
        .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
        .join('; ');
      attributes.push(`style={{${styleStr}}}`);
    }
    
    const attributesStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    
    // Handle self-closing tags
    if (['img', 'input', 'br', 'hr'].includes(type)) {
      return `${indent}<${type}${attributesStr} />`;
    }
    
    // Handle content
    let content = '';
    if (props.children && typeof props.children === 'string') {
      content = props.children;
    } else if (children && children.length > 0) {
      content = '\n' + visualToReactCode(children, indentLevel + 1) + '\n' + indent;
    }
    
    return `${indent}<${type}${attributesStr}>${content}</${type}>`;
  }).join('\n');
}

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Extract component from generated files
 */
export function extractComponentFromFiles(files: Record<string, string>): VisualElement[] {
  // Look for main component files
  const componentFiles = Object.entries(files).filter(([path]) => 
    path.includes('component') || path.includes('page') || path.includes('index')
  );
  
  if (componentFiles.length === 0) {
    return [];
  }
  
  // Parse the first component file found
  const [, content] = componentFiles[0];
  
  // Find the return statement with JSX
  const returnMatch = content.match(/return\s*\(([\s\S]*?)\);?/);
  if (returnMatch) {
    return parseReactCode(returnMatch[1]);
  }
  
  // Fallback: look for JSX in the entire file
  return parseReactCode(content);
}

/**
 * Generate a complete React component from visual elements
 */
export function generateReactComponent(
  elements: VisualElement[],
  componentName = 'GeneratedComponent'
): string {
  const jsxCode = visualToReactCode(elements);
  
  return `import React from 'react';

export default function ${componentName}() {
  return (
${jsxCode.split('\n').map(line => '    ' + line).join('\n')}
  );
}`;
}
