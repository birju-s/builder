"use client";
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  MousePointer, 
  Image, 
  Square, 
  FileText,
  TextCursor,
  Grid3X3,
  Layout,
  List,
  Navigation
} from 'lucide-react';

interface ComponentType {
  id: string;
  name: string;
  type: string;
  icon: React.ReactNode;
  description: string;
  defaultProps: Record<string, any>;
  category: 'basic' | 'layout' | 'form' | 'navigation';
}

const COMPONENT_TYPES: ComponentType[] = [
  // Basic Components
  {
    id: 'heading',
    name: 'Heading',
    type: 'h2',
    icon: <Type className="h-4 w-4" />,
    description: 'Text heading',
    defaultProps: { children: 'Your Heading' },
    category: 'basic',
  },
  {
    id: 'paragraph',
    name: 'Paragraph',
    type: 'p',
    icon: <FileText className="h-4 w-4" />,
    description: 'Text paragraph',
    defaultProps: { children: 'Your paragraph text goes here...' },
    category: 'basic',
  },
  {
    id: 'button',
    name: 'Button',
    type: 'button',
    icon: <MousePointer className="h-4 w-4" />,
    description: 'Clickable button',
    defaultProps: { 
      children: 'Click me',
      className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
    },
    category: 'basic',
  },
  {
    id: 'image',
    name: 'Image',
    type: 'img',
    icon: <Image className="h-4 w-4" />,
    description: 'Image element',
    defaultProps: {
      src: 'https://via.placeholder.com/300x200',
      alt: 'Placeholder image',
      className: 'rounded-lg'
    },
    category: 'basic',
  },
  
  // Layout Components
  {
    id: 'container',
    name: 'Container',
    type: 'div',
    icon: <Square className="h-4 w-4" />,
    description: 'Generic container',
    defaultProps: {
      className: 'p-4 border rounded-lg'
    },
    category: 'layout',
  },
  {
    id: 'flex-row',
    name: 'Flex Row',
    type: 'div',
    icon: <Grid3X3 className="h-4 w-4" />,
    description: 'Horizontal flex container',
    defaultProps: {
      className: 'flex flex-row gap-4 items-center'
    },
    category: 'layout',
  },
  {
    id: 'flex-col',
    name: 'Flex Column',
    type: 'div',
    icon: <Layout className="h-4 w-4" />,
    description: 'Vertical flex container',
    defaultProps: {
      className: 'flex flex-col gap-4'
    },
    category: 'layout',
  },
  
  // Form Components
  {
    id: 'input',
    name: 'Text Input',
    type: 'input',
    icon: <TextCursor className="h-4 w-4" />,
    description: 'Text input field',
    defaultProps: {
      type: 'text',
      placeholder: 'Enter text...',
      className: 'px-3 py-2 border rounded-md'
    },
    category: 'form',
  },
  {
    id: 'textarea',
    name: 'Textarea',
    type: 'textarea',
    icon: <FileText className="h-4 w-4" />,
    description: 'Multi-line text input',
    defaultProps: {
      placeholder: 'Enter text...',
      rows: 4,
      className: 'px-3 py-2 border rounded-md w-full'
    },
    category: 'form',
  },
];

interface DraggableComponentProps {
  component: ComponentType;
}

function DraggableComponent({ component }: DraggableComponentProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'component',
    item: {
      componentType: component.type,
      defaultProps: component.defaultProps,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`
        p-3 border rounded-lg cursor-grab hover:bg-muted/50 transition-colors
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        {component.icon}
        <span className="font-medium text-sm">{component.name}</span>
      </div>
      <p className="text-xs text-muted-foreground">{component.description}</p>
    </div>
  );
}

interface Props {
  className?: string;
  /**
   * Components provided by installed integrations (e.g., Clerk, Stripe).
   * These are injected by the parent based on the project's integration
   * registry so the palette stays fully dynamic.
   */
  integrationComponents?: ComponentType[];
}

export function ComponentPalette({ className, integrationComponents = [] }: Props) {
  const categories = {
    basic: COMPONENT_TYPES.filter(c => c.category === 'basic'),
    layout: COMPONENT_TYPES.filter(c => c.category === 'layout'),
    form: COMPONENT_TYPES.filter(c => c.category === 'form'),
    navigation: COMPONENT_TYPES.filter(c => c.category === 'navigation'),
    integrations: integrationComponents,
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Components</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Basic
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {categories.basic.map((component) => (
              <DraggableComponent key={component.id} component={component} />
            ))}
          </div>
        </div>

        {categories.integrations.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Integrations
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {categories.integrations.map((component) => (
                <DraggableComponent key={component.id} component={component} />
              ))}
            </div>
          </div>
        )}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Layout
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {categories.layout.map((component) => (
              <DraggableComponent key={component.id} component={component} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Form
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {categories.form.map((component) => (
              <DraggableComponent key={component.id} component={component} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
