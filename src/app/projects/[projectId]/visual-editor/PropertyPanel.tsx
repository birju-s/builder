"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Trash2, Copy, Settings } from 'lucide-react';
import { VisualElement } from './VisualCanvas';

interface Props {
  selectedElement: VisualElement | null;
  onElementUpdate: (elementId: string, updates: Partial<VisualElement>) => void;
  onElementDelete: (elementId: string) => void;
  onElementDuplicate?: (elementId: string) => void;
  className?: string;
}

export function PropertyPanel({
  selectedElement,
  onElementUpdate,
  onElementDelete,
  onElementDuplicate,
  className,
}: Props) {
  const [activeTab, setActiveTab] = useState('content');

  if (!selectedElement) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select an element to edit its properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateProperty = (path: string, value: any) => {
    const updates: Partial<VisualElement> = {};
    const pathParts = path.split('.');
    
    if (pathParts[0] === 'props') {
      updates.props = { ...selectedElement.props, [pathParts[1]]: value };
    } else if (pathParts[0] === 'style') {
      updates.style = { ...selectedElement.style, [pathParts[1]]: value };
    } else {
      (updates as any)[path] = value;
    }
    
    onElementUpdate(selectedElement.id, updates);
  };

  const parseSpacing = (value: string) => {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Properties</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {selectedElement.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Element Actions */}
        <div className="flex gap-2">
          {onElementDuplicate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onElementDuplicate(selectedElement.id)}
              className="flex-1"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onElementDelete(selectedElement.id)}
            className="flex-1"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            {/* Text Content */}
            {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button'].includes(selectedElement.type)) && (
              <div>
                <Label htmlFor="text-content" className="text-xs">Text Content</Label>
                <Textarea
                  id="text-content"
                  value={selectedElement.props.children || ''}
                  onChange={(e) => updateProperty('props.children', e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
            )}

            {/* Image Properties */}
            {selectedElement.type === 'img' && (
              <>
                <div>
                  <Label htmlFor="img-src" className="text-xs">Image URL</Label>
                  <Input
                    id="img-src"
                    value={selectedElement.props.src || ''}
                    onChange={(e) => updateProperty('props.src', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="img-alt" className="text-xs">Alt Text</Label>
                  <Input
                    id="img-alt"
                    value={selectedElement.props.alt || ''}
                    onChange={(e) => updateProperty('props.alt', e.target.value)}
                    placeholder="Describe the image"
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {/* Input Properties */}
            {(['input', 'textarea'].includes(selectedElement.type)) && (
              <>
                <div>
                  <Label htmlFor="input-placeholder" className="text-xs">Placeholder</Label>
                  <Input
                    id="input-placeholder"
                    value={selectedElement.props.placeholder || ''}
                    onChange={(e) => updateProperty('props.placeholder', e.target.value)}
                    className="text-sm"
                  />
                </div>
                {selectedElement.type === 'input' && (
                  <div>
                    <Label htmlFor="input-type" className="text-xs">Input Type</Label>
                    <Select
                      value={selectedElement.props.type || 'text'}
                      onValueChange={(value) => updateProperty('props.type', value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="password">Password</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="tel">Phone</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="text-color" className="text-xs">Text Color</Label>
                <Input
                  id="text-color"
                  type="color"
                  value={selectedElement.style?.color || '#000000'}
                  onChange={(e) => updateProperty('style.color', e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="bg-color" className="text-xs">Background</Label>
                <Input
                  id="bg-color"
                  type="color"
                  value={selectedElement.style?.backgroundColor || '#ffffff'}
                  onChange={(e) => updateProperty('style.backgroundColor', e.target.value)}
                  className="h-8"
                />
              </div>
            </div>

            {/* Typography */}
            <div>
              <Label htmlFor="font-size" className="text-xs">Font Size (px)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[parseSpacing(selectedElement.style?.fontSize?.toString() || '16')]}
                  onValueChange={([value]) => updateProperty('style.fontSize', `${value}px`)}
                  max={72}
                  min={8}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {parseSpacing(selectedElement.style?.fontSize?.toString() || '16')}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="font-weight" className="text-xs">Font Weight</Label>
              <Select
                value={selectedElement.style?.fontWeight?.toString() || 'normal'}
                onValueChange={(value) => updateProperty('style.fontWeight', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="lighter">Light</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="300">300</SelectItem>
                  <SelectItem value="400">400</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="600">600</SelectItem>
                  <SelectItem value="700">700</SelectItem>
                  <SelectItem value="800">800</SelectItem>
                  <SelectItem value="900">900</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Border */}
            <div>
              <Label htmlFor="border-width" className="text-xs">Border Width (px)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[parseSpacing(selectedElement.style?.borderWidth?.toString() || '0')]}
                  onValueChange={([value]) => {
                    updateProperty('style.borderWidth', `${value}px`);
                    if (value > 0 && !selectedElement.style?.borderStyle) {
                      updateProperty('style.borderStyle', 'solid');
                    }
                  }}
                  max={10}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {parseSpacing(selectedElement.style?.borderWidth?.toString() || '0')}
                </span>
              </div>
            </div>

            {selectedElement.style?.borderWidth && parseSpacing(selectedElement.style.borderWidth.toString()) > 0 && (
              <div>
                <Label htmlFor="border-color" className="text-xs">Border Color</Label>
                <Input
                  id="border-color"
                  type="color"
                  value={selectedElement.style?.borderColor || '#000000'}
                  onChange={(e) => updateProperty('style.borderColor', e.target.value)}
                  className="h-8"
                />
              </div>
            )}

            <div>
              <Label htmlFor="border-radius" className="text-xs">Border Radius (px)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[parseSpacing(selectedElement.style?.borderRadius?.toString() || '0')]}
                  onValueChange={([value]) => updateProperty('style.borderRadius', `${value}px`)}
                  max={50}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {parseSpacing(selectedElement.style?.borderRadius?.toString() || '0')}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            {/* Spacing */}
            <div>
              <Label className="text-xs">Padding (px)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Input
                    placeholder="Top"
                    value={selectedElement.style?.paddingTop?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.paddingTop', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Right"
                    value={selectedElement.style?.paddingRight?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.paddingRight', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Bottom"
                    value={selectedElement.style?.paddingBottom?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.paddingBottom', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Left"
                    value={selectedElement.style?.paddingLeft?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.paddingLeft', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Margin (px)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Input
                    placeholder="Top"
                    value={selectedElement.style?.marginTop?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.marginTop', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Right"
                    value={selectedElement.style?.marginRight?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.marginRight', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Bottom"
                    value={selectedElement.style?.marginBottom?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.marginBottom', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Left"
                    value={selectedElement.style?.marginLeft?.toString().replace('px', '') || ''}
                    onChange={(e) => updateProperty('style.marginLeft', `${e.target.value}px`)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="width" className="text-xs">Width</Label>
                <Input
                  id="width"
                  value={selectedElement.style?.width?.toString() || ''}
                  onChange={(e) => updateProperty('style.width', e.target.value)}
                  placeholder="auto"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs">Height</Label>
                <Input
                  id="height"
                  value={selectedElement.style?.height?.toString() || ''}
                  onChange={(e) => updateProperty('style.height', e.target.value)}
                  placeholder="auto"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Display */}
            <div>
              <Label htmlFor="display" className="text-xs">Display</Label>
              <Select
                value={selectedElement.style?.display?.toString() || 'block'}
                onValueChange={(value) => updateProperty('style.display', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="inline">Inline</SelectItem>
                  <SelectItem value="inline-block">Inline Block</SelectItem>
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
