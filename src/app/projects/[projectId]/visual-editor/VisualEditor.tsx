"use client";
import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Eye, 
  Paintbrush, 
  Undo, 
  Redo, 
  Download, 
  Upload,
  Wand2
} from 'lucide-react';

import { VisualCanvas, VisualElement } from './VisualCanvas';
import { ComponentPalette } from './ComponentPalette';
import { PropertyPanel } from './PropertyPanel';
import { parseCodeToVisualElements, generateCodeFromVisualElements } from './code-parser';

interface Props {
  projectId: string;
  initialFiles?: Record<string, string>;
  onCodeUpdate?: (files: Record<string, string>) => void;
  onRequestAIGeneration?: (prompt: string) => void;
}

export function VisualEditor({
  projectId,
  initialFiles = {},
  onCodeUpdate,
  onRequestAIGeneration,
}: Props) {
  const [elements, setElements] = useState<VisualElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'visual' | 'code'>('visual');
  const [history, setHistory] = useState<VisualElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiPrompt, setAiPrompt] = useState('');

  // Initialize elements from code files
  useEffect(() => {
    if (Object.keys(initialFiles).length > 0) {
      // Find the main component file (look for JSX/TSX files)
      const componentFiles = Object.entries(initialFiles).filter(([path]) =>
        path.match(/\.(jsx?|tsx?)$/) && !path.includes('index') && !path.includes('app')
      );

      if (componentFiles.length > 0) {
        const [, code] = componentFiles[0]; // Use first component file
        const parsedElements = parseCodeToVisualElements(code);
        setElements(parsedElements);
        addToHistory(parsedElements);
      }
    }
  }, [initialFiles]);

  const addToHistory = (newElements: VisualElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousElements = history[historyIndex - 1];
      setElements([...previousElements]);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextElements = history[historyIndex + 1];
      setElements([...nextElements]);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const updateElement = (elementId: string, updates: Partial<VisualElement>) => {
    const updateElementRecursive = (elements: VisualElement[]): VisualElement[] => {
      return elements.map(element => {
        if (element.id === elementId) {
          return { ...element, ...updates };
        }
        if (element.children) {
          return {
            ...element,
            children: updateElementRecursive(element.children),
          };
        }
        return element;
      });
    };

    const newElements = updateElementRecursive(elements);
    setElements(newElements);
    addToHistory(newElements);

    // Sync with code
    syncToCode(newElements);
  };

  const addElement = (newElement: VisualElement, parentId?: string) => {
    const addElementRecursive = (elements: VisualElement[]): VisualElement[] => {
      if (!parentId) {
        return [...elements, newElement];
      }

      return elements.map(element => {
        if (element.id === parentId) {
          return {
            ...element,
            children: [...(element.children || []), newElement],
          };
        }
        if (element.children) {
          return {
            ...element,
            children: addElementRecursive(element.children),
          };
        }
        return element;
      });
    };

    const newElements = addElementRecursive(elements);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElementId(newElement.id);

    // Sync with code
    syncToCode(newElements);
  };

  const deleteElement = (elementId: string) => {
    const deleteElementRecursive = (elements: VisualElement[]): VisualElement[] => {
      return elements
        .filter(element => element.id !== elementId)
        .map(element => ({
          ...element,
          children: element.children ? deleteElementRecursive(element.children) : undefined,
        }));
    };

    const newElements = deleteElementRecursive(elements);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElementId('');

    // Sync with code
    syncToCode(newElements);
  };

  const duplicateElement = (elementId: string) => {
    // Find the selected element
    const selectedElement = findElementById(elements, elementId);
    if (selectedElement) {
      const duplicated = {
        ...selectedElement,
        id: `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      addElement(duplicated);
    }
  };

  const findElementById = (elements: VisualElement[], id: string): VisualElement | null => {
    for (const element of elements) {
      if (element.id === id) {
        return element;
      }
      if (element.children) {
        const found = findElementById(element.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const syncToCode = (elements: VisualElement[]) => {
    if (onCodeUpdate && elements.length > 0) {
      const generatedCode = generateCodeFromVisualElements(elements);
      
      // Create a basic React component structure
      const componentCode = `
import React from 'react';

export default function GeneratedComponent() {
  return (
    <div className="min-h-screen">
${generatedCode.split('\n').map(line => `      ${line}`).join('\n')}
    </div>
  );
}
`.trim();

      onCodeUpdate({
        'components/GeneratedComponent.tsx': componentCode,
      });
    }
  };

  const handleAIGeneration = () => {
    if (aiPrompt.trim() && onRequestAIGeneration) {
      onRequestAIGeneration(aiPrompt);
      setAiPrompt('');
    }
  };

  const selectedElement = selectedElementId ? findElementById(elements, selectedElementId) : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Visual Editor</h2>
              <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as any)}>
                <TabsList>
                  <TabsTrigger value="visual">
                    <Eye className="h-4 w-4 mr-1" />
                    Visual
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Code className="h-4 w-4 mr-1" />
                    Code
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="text-xs">
                {elements.length} elements
              </Badge>
            </div>
          </div>

          {/* AI Generation Bar */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Describe what you want to add or change..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIGeneration()}
                className="flex-1 bg-transparent border-none outline-none text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAIGeneration}
              disabled={!aiPrompt.trim()}
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {activeMode === 'visual' ? (
            <>
              {/* Component Palette */}
              <div className="w-64 border-r">
                <ComponentPalette />
              </div>

              {/* Canvas */}
              <div className="flex-1 flex flex-col">
                <VisualCanvas
                  elements={elements}
                  selectedElementId={selectedElementId}
                  onElementSelect={setSelectedElementId}
                  onElementUpdate={updateElement}
                  onElementAdd={addElement}
                  onElementDelete={deleteElement}
                />
              </div>

              {/* Property Panel */}
              <div className="w-80 border-l">
                <PropertyPanel
                  selectedElement={selectedElement}
                  onElementUpdate={updateElement}
                  onElementDelete={deleteElement}
                  onElementDuplicate={duplicateElement}
                />
              </div>
            </>
          ) : (
            // Code View
            <div className="flex-1 p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Generated Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                    <code>{generateCodeFromVisualElements(elements)}</code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
