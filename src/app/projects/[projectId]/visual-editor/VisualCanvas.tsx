"use client";
import { useState, useRef, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { cn } from '@/lib/utils';

export interface VisualElement {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: VisualElement[];
  style?: React.CSSProperties;
  className?: string;
}

interface Props {
  elements: VisualElement[];
  selectedElementId?: string;
  onElementSelect: (elementId: string) => void;
  onElementUpdate: (elementId: string, updates: Partial<VisualElement>) => void;
  onElementAdd: (element: VisualElement, parentId?: string) => void;
  onElementDelete: (elementId: string) => void;
}

export function VisualCanvas({
  elements,
  selectedElementId,
  onElementSelect,
  onElementUpdate,
  onElementAdd,
  onElementDelete,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: ['component'],
    drop: (item: any, monitor) => {
      if (!monitor.didDrop()) {
        // Create new element from dropped component
        const newElement: VisualElement = {
          id: `element-${Date.now()}`,
          type: item.componentType,
          props: item.defaultProps || {},
          style: {},
          className: '',
        };
        onElementAdd(newElement);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  const renderElement = useCallback((element: VisualElement): React.ReactNode => {
    const isSelected = element.id === selectedElementId;
    
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onElementSelect(element.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' && isSelected) {
        onElementDelete(element.id);
      }
    };

    const elementStyle = {
      ...element.style,
      ...(isSelected && {
        outline: '2px solid #3b82f6',
        outlineOffset: '2px',
      }),
    };

    const elementProps = {
      ...element.props,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      style: elementStyle,
      className: cn(element.className, isSelected && 'cursor-pointer'),
      tabIndex: 0,
    };

    // Render different element types
    switch (element.type) {
      case 'div':
        return (
          <div key={element.id} {...elementProps}>
            {element.children?.map(renderElement)}
            {!element.children?.length && !element.props.children && (
              <div className="min-h-[20px] min-w-[20px] text-muted-foreground text-sm flex items-center justify-center">
                Empty div
              </div>
            )}
          </div>
        );
      
      case 'button':
        return (
          <button key={element.id} {...elementProps}>
            {element.props.children || 'Button'}
          </button>
        );
      
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const HeadingTag = element.type as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag key={element.id} {...elementProps}>
            {element.props.children || 'Heading'}
          </HeadingTag>
        );
      
      case 'p':
        return (
          <p key={element.id} {...elementProps}>
            {element.props.children || 'Paragraph text'}
          </p>
        );
      
      case 'img':
        return (
          <img
            key={element.id}
            {...elementProps}
            src={element.props.src || 'https://via.placeholder.com/300x200'}
            alt={element.props.alt || 'Image'}
            style={{
              ...elementStyle,
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        );
      
      case 'input':
        return (
          <input
            key={element.id}
            {...elementProps}
            placeholder={element.props.placeholder || 'Enter text...'}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            key={element.id}
            {...elementProps}
            placeholder={element.props.placeholder || 'Enter text...'}
            rows={element.props.rows || 3}
          />
        );
      
      default:
        return (
          <div key={element.id} {...elementProps}>
            <div className="text-muted-foreground text-sm">
              Unknown element: {element.type}
            </div>
            {element.children?.map(renderElement)}
          </div>
        );
    }
  }, [selectedElementId, onElementSelect, onElementDelete]);

  return (
    <div
      ref={(node) => {
        canvasRef.current = node;
        drop(node);
      }}
      className={cn(
        'flex-1 bg-background border rounded-lg overflow-auto relative',
        isOver && 'bg-blue-50 border-blue-300',
        isDragging && 'opacity-50'
      )}
      onClick={() => onElementSelect('')} // Deselect when clicking canvas
    >
      <div className="min-h-full p-4">
        {elements.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">Empty Canvas</div>
              <div className="text-sm">
                Drag components from the palette or use AI to generate content
              </div>
            </div>
          </div>
        ) : (
          elements.map(renderElement)
        )}
      </div>
      
      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 border-2 border-dashed border-blue-400 flex items-center justify-center">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg">
            Drop component here
          </div>
        </div>
      )}
    </div>
  );
}
