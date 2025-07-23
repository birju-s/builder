"use client";
import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Eye, Code, Layers, Palette, Save, Undo, Redo } from 'lucide-react';

import { VisualCanvas, VisualElement } from './VisualCanvas';
import { ComponentPalette } from './ComponentPalette';
import { PropertyPanel } from './PropertyPanel';
import { 
  extractComponentFromFiles, 
  visualToReactCode, 
  generateReactComponent 
} from './CodeToVisualParser';

interface Props {
  projectId: string;
  initialFiles?: Record<string, string>;
  onFilesUpdate?: (files: Record<string, string>) => void;
  onSave?: () => void;
}

export function VisualEditor({ 
  projectId, 
  initialFiles = {}, 
  onFilesUpdate,
  onSave 
}: Props) {
  const [elements, setElements] = useState<VisualElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'layers'>('visual');
  const [history, setHistory] = useState<VisualElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize elements from generated files
  useEffect(() => {
    if (Object.keys(initialFiles).length > 0) {
      const parsedElements = extractComponentFromFiles(initialFiles);
      setElements(parsedElements);
      setHistory([parsedElements]);
      setHistoryIndex(0);
    }
  }, [initialFiles]);

  // Track changes for history
  const addToHistory = (newElements: VisualElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setHasUnsavedChanges(true);
  };

  const handleElementAdd = (element: VisualElement, parentId?: string) => {
    const newElements = [...elements];
    
    if (parentId) {
      // Add to specific parent (nested)
      const addToParent = (els: VisualElement[]): VisualElement[] => {
        return els.map(el => {
          if (el.id === parentId) {
            return {
              ...el,
              children: [...(el.children || []), element]
            };
          } else if (el.children) {
            return {
              ...el,
              children: addToParent(el.children)
            };
          }
          return el;
        });
      };
      const updated = addToParent(newElements);
      setElements(updated);
      addToHistory(updated);
    } else {
      // Add to root
      const updated = [...newElements, element];
      setElements(updated);
      addToHistory(updated);
    }
  };

  const handleElementUpdate = (elementId: string, updates: Partial<VisualElement>) => {
    const updateElement = (els: VisualElement[]): VisualElement[] => {
      return els.map(el => {
        if (el.id === elementId) {
          return { ...el, ...updates };
        } else if (el.children) {
          return {
            ...el,
            children: updateElement(el.children)
          };
        }
        return el;
      });
    };
    
    const updated = updateElement(elements);
    setElements(updated);
    addToHistory(updated);
  };

  const handleElementDelete = (elementId: string) => {
    const deleteElement = (els: VisualElement[]): VisualElement[] => {
      return els.filter(el => {
        if (el.id === elementId) {
          return false;
        } else if (el.children) {
          el.children = deleteElement(el.children);
        }
        return true;
      });
    };
    
    const updated = deleteElement(elements);
    setElements(updated);
    addToHistory(updated);
    setSelectedElementId('');
  };

  const handleElementDuplicate = (elementId: string) => {
    const findAndDuplicate = (els: VisualElement[]): VisualElement[] => {
      const result: VisualElement[] = [];
      
      for (const el of els) {
        result.push(el);
        
        if (el.id === elementId) {
          // Create duplicate with new ID
          const duplicate: VisualElement = {
            ...el,
            id: `${el.id}-copy-${Date.now()}`,
            children: el.children ? duplicateChildren(el.children) : undefined
          };
          result.push(duplicate);
        } else if (el.children) {
          el.children = findAndDuplicate(el.children);
        }
      }
      
      return result;
    };
    
    const duplicateChildren = (children: VisualElement[]): VisualElement[] => {
      return children.map(child => ({
        ...child,
        id: `${child.id}-copy-${Date.now()}`,
        children: child.children ? duplicateChildren(child.children) : undefined
      }));
    };
    
    const updated = findAndDuplicate(elements);
    setElements(updated);
    addToHistory(updated);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const handleSave = async () => {
    if (elements.length === 0 || !onFilesUpdate) return;
    
    // Generate React component code
    const componentCode = generateReactComponent(elements, 'VisualComponent');
    
    // Update files with new component
    const updatedFiles = {
      ...initialFiles,
      'src/components/VisualComponent.tsx': componentCode,
    };
    
    onFilesUpdate(updatedFiles);
    setHasUnsavedChanges(false);
    onSave?.();
  };

  const selectedElement = elements.find(el => el.id === selectedElementId) || 
    findElementById(elements, selectedElementId);

  function findElementById(els: VisualElement[], id: string): VisualElement | null {
    for (const el of els) {
      if (el.id === id) return el;
      if (el.children) {
        const found = findElementById(el.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const renderLayersTree = (els: VisualElement[], depth = 0): React.ReactNode => {
    return els.map(el => (
      <div key={el.id} style={{ marginLeft: depth * 16 }}>
        <div
          className={`
            flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer
            ${el.id === selectedElementId ? 'bg-blue-100 border border-blue-300' : ''}
          `}
          onClick={() => setSelectedElementId(el.id)}
        >
          <Layers className="h-3 w-3" />
          <span className="text-sm">{el.type}</span>
          {el.props.children && typeof el.props.children === 'string' && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              "{el.props.children}"
            </span>
          )}
        </div>
        {el.children && renderLayersTree(el.children, depth + 1)}
      </div>
    ));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Visual Editor</h3>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs">
                Unsaved changes
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Component Palette */}
          <div className="w-64 border-r bg-muted/20 overflow-auto">
            <ComponentPalette />
          </div>

          {/* Center - Canvas/Code View */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="w-full justify-start border-b rounded-none">
                <TabsTrigger value="visual" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="layers" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Layers
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="flex-1 p-4">
                <VisualCanvas
                  elements={elements}
                  selectedElementId={selectedElementId}
                  onElementSelect={setSelectedElementId}
                  onElementUpdate={handleElementUpdate}
                  onElementAdd={handleElementAdd}
                  onElementDelete={handleElementDelete}
                />
              </TabsContent>

              <TabsContent value="code" className="flex-1 p-4">
                <div className="h-full bg-muted/20 rounded-lg p-4 font-mono text-sm overflow-auto">
                  <pre className="whitespace-pre-wrap">
                    {elements.length > 0 
                      ? generateReactComponent(elements, 'VisualComponent')
                      : '// No elements to display\n// Add components from the palette or use AI generation'
                    }
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="layers" className="flex-1 p-4">
                <div className="space-y-1">
                  {elements.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No elements to display</p>
                    </div>
                  ) : (
                    renderLayersTree(elements)
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 border-l bg-muted/20 overflow-auto">
            <PropertyPanel
              selectedElement={selectedElement}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleElementDelete}
              onElementDuplicate={handleElementDuplicate}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
