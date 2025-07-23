import { VisualElement } from './VisualCanvas';

/**
 * Parse AI-generated React/HTML code into visual elements
 */
export function parseCodeToVisualElements(code: string): VisualElement[] {
  try {
    // Remove imports and exports for parsing
    const cleanCode = code
      .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '')
      .replace(/export\s+(default\s+)?/g, '')
      .trim();

    // Simple JSX parser - looks for JSX elements and converts them
    const elements = parseJSXElements(cleanCode);
    return elements;
  } catch (error) {
    console.error('Failed to parse code to visual elements:', error);
    return [];
  }
}

/**
 * Parse JSX string into visual elements structure
 */
function parseJSXElements(jsxString: string): VisualElement[] {
  const elements: VisualElement[] = [];
  
  // Match JSX elements (simplified parser)
  const elementRegex = /<(\w+)([^>]*?)(?:\/>|>(.*?)<\/\1>)/gs;
  let match;
  
  while ((match = elementRegex.exec(jsxString)) !== null) {
    const [fullMatch, tagName, attributesString, children] = match;
    
    const element: VisualElement = {
      id: `parsed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: tagName,
      props: parseAttributes(attributesString),
      style: {},
      className: '',
    };
    
    // Parse children if they exist
    if (children && children.trim()) {
      const childElements = parseJSXElements(children);
      if (childElements.length > 0) {
        element.children = childElements;
      } else {
        // If no child elements, treat as text content
        const textContent = children.trim();
        if (textContent && !textContent.includes('<')) {
          element.props.children = textContent;
        }
      }
    }
    
    // Extract className and style
    extractStyling(element);
    
    elements.push(element);
  }
  
  return elements;
}

/**
 * Parse HTML/JSX attributes into props object
 */
function parseAttributes(attributesString: string): Record<string, any> {
  const props: Record<string, any> = {};
  
  if (!attributesString) return props;
  
  // Match attribute="value" or attribute={value}
  const attrRegex = /(\w+)(?:=(?:"([^"]*)"|{([^}]*)}|'([^']*)'))?/g;
  let match;
  
  while ((match = attrRegex.exec(attributesString)) !== null) {
    const [, name, stringVal, jsxVal, singleQuoteVal] = match;
    
    let value = stringVal || singleQuoteVal || jsxVal || true;
    
    // Handle special cases
    if (name === 'style' && typeof value === 'string') {
      value = parseInlineStyle(value);
    }
    
    props[name] = value;
  }
  
  return props;
}

/**
 * Parse CSS string into style object
 */
function parseInlineStyle(styleString: string): Record<string, string> {
  const style: Record<string, string> = {};
  
  if (!styleString) return style;
  
  const declarations = styleString.split(';').filter(Boolean);
  
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      style[camelProperty] = value;
    }
  }
  
  return style;
}

/**
 * Extract styling information from props into style object
 */
function extractStyling(element: VisualElement) {
  // Move className to element.className
  if (element.props.className) {
    element.className = element.props.className;
    delete element.props.className;
  }
  
  // Move style to element.style
  if (element.props.style) {
    element.style = { ...element.style, ...element.props.style };
    delete element.props.style;
  }
  
  // Convert Tailwind classes to inline styles (basic mapping)
  if (element.className) {
    const tailwindStyles = convertTailwindToStyles(element.className);
    element.style = { ...element.style, ...tailwindStyles };
  }
}

/**
 * Convert common Tailwind classes to inline styles
 */
function convertTailwindToStyles(className: string): Record<string, string> {
  const styles: Record<string, string> = {};
  const classes = className.split(' ');
  
  for (const cls of classes) {
    // Colors
    if (cls.startsWith('text-')) {
      const color = getTailwindColor(cls.replace('text-', ''));
      if (color) styles.color = color;
    }
    if (cls.startsWith('bg-')) {
      const color = getTailwindColor(cls.replace('bg-', ''));
      if (color) styles.backgroundColor = color;
    }
    
    // Spacing
    if (cls.startsWith('p-')) {
      const spacing = getTailwindSpacing(cls.replace('p-', ''));
      if (spacing) styles.padding = spacing;
    }
    if (cls.startsWith('m-')) {
      const spacing = getTailwindSpacing(cls.replace('m-', ''));
      if (spacing) styles.margin = spacing;
    }
    
    // Typography
    if (cls.startsWith('text-')) {
      const size = getTailwindTextSize(cls);
      if (size) styles.fontSize = size;
    }
    if (cls === 'font-bold') styles.fontWeight = 'bold';
    if (cls === 'font-medium') styles.fontWeight = '500';
    if (cls === 'font-light') styles.fontWeight = '300';
    
    // Layout
    if (cls === 'flex') styles.display = 'flex';
    if (cls === 'block') styles.display = 'block';
    if (cls === 'inline') styles.display = 'inline';
    if (cls === 'hidden') styles.display = 'none';
    
    // Border
    if (cls.startsWith('rounded')) {
      if (cls === 'rounded') styles.borderRadius = '0.25rem';
      if (cls === 'rounded-lg') styles.borderRadius = '0.5rem';
      if (cls === 'rounded-xl') styles.borderRadius = '0.75rem';
      if (cls === 'rounded-full') styles.borderRadius = '9999px';
    }
  }
  
  return styles;
}

function getTailwindColor(colorClass: string): string | null {
  const colors: Record<string, string> = {
    'white': '#ffffff',
    'black': '#000000',
    'gray-100': '#f7fafc',
    'gray-200': '#edf2f7',
    'gray-300': '#e2e8f0',
    'gray-400': '#cbd5e0',
    'gray-500': '#a0aec0',
    'gray-600': '#718096',
    'gray-700': '#4a5568',
    'gray-800': '#2d3748',
    'gray-900': '#1a202c',
    'blue-100': '#ebf8ff',
    'blue-200': '#bee3f8',
    'blue-300': '#90cdf4',
    'blue-400': '#63b3ed',
    'blue-500': '#4299e1',
    'blue-600': '#3182ce',
    'blue-700': '#2b77cb',
    'blue-800': '#2c5282',
    'blue-900': '#2a4365',
    'red-500': '#f56565',
    'green-500': '#68d391',
    'yellow-500': '#ecc94b',
    'purple-500': '#9f7aea',
  };
  
  return colors[colorClass] || null;
}

function getTailwindSpacing(spacing: string): string | null {
  const spacings: Record<string, string> = {
    '0': '0',
    '1': '0.25rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '8': '2rem',
    '10': '2.5rem',
    '12': '3rem',
    '16': '4rem',
    '20': '5rem',
    '24': '6rem',
  };
  
  return spacings[spacing] || null;
}

function getTailwindTextSize(className: string): string | null {
  const sizes: Record<string, string> = {
    'text-xs': '0.75rem',
    'text-sm': '0.875rem',
    'text-base': '1rem',
    'text-lg': '1.125rem',
    'text-xl': '1.25rem',
    'text-2xl': '1.5rem',
    'text-3xl': '1.875rem',
    'text-4xl': '2.25rem',
    'text-5xl': '3rem',
    'text-6xl': '3.75rem',
  };
  
  return sizes[className] || null;
}

/**
 * Convert visual elements back to React/HTML code
 */
export function generateCodeFromVisualElements(elements: VisualElement[]): string {
  return elements.map(generateElementCode).join('\n');
}

function generateElementCode(element: VisualElement, indent = 0): string {
  const indentStr = '  '.repeat(indent);
  const { type, props, style, className, children } = element;
  
  // Combine style and className
  const allProps: Record<string, any> = { ...props };
  
  if (className) {
    allProps.className = className;
  }
  
  if (style && Object.keys(style).length > 0) {
    allProps.style = style;
  }
  
  // Generate props string
  const propsString = Object.entries(allProps)
    .map(([key, value]) => {
      if (key === 'style') {
        const styleString = Object.entries(value as Record<string, any>)
          .map(([prop, val]) => `${prop}: "${val}"`)
          .join(', ');
        return `style={{${styleString}}}`;
      } else if (typeof value === 'string') {
        return `${key}="${value}"`;
      } else if (typeof value === 'boolean' && value) {
        return key;
      } else {
        return `${key}={${JSON.stringify(value)}}`;
      }
    })
    .join(' ');
  
  const propsStr = propsString ? ` ${propsString}` : '';
  
  // Handle self-closing tags
  if (['img', 'input', 'br', 'hr'].includes(type)) {
    return `${indentStr}<${type}${propsStr} />`;
  }
  
  // Handle children
  const hasChildren = children && children.length > 0;
  const hasTextContent = props.children && typeof props.children === 'string';
  
  if (!hasChildren && !hasTextContent) {
    return `${indentStr}<${type}${propsStr}></${type}>`;
  }
  
  if (hasTextContent && !hasChildren) {
    return `${indentStr}<${type}${propsStr}>${props.children}</${type}>`;
  }
  
  if (hasChildren) {
    const childrenCode = children!
      .map(child => generateElementCode(child, indent + 1))
      .join('\n');
    return `${indentStr}<${type}${propsStr}>\n${childrenCode}\n${indentStr}</${type}>`;
  }
  
  return `${indentStr}<${type}${propsStr}></${type}>`;
}
