"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Paintbrush } from 'lucide-react';

interface Props {
  projectId: string;
}

export function EditorModeToggle({ projectId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get('mode') || 'ai';

  const switchMode = (mode: 'ai' | 'visual') => {
    const params = new URLSearchParams(searchParams);
    
    if (mode === 'visual') {
      params.set('mode', 'visual');
    } else {
      params.delete('mode'); // Default is AI mode
    }
    
    router.push(`/projects/${projectId}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
      <Button
        size="sm"
        variant={currentMode === 'ai' ? 'default' : 'ghost'}
        onClick={() => switchMode('ai')}
        className="flex items-center gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        AI Chat
        {currentMode === 'ai' && <Badge variant="secondary" className="ml-1">Active</Badge>}
      </Button>
      
      <Button
        size="sm"
        variant={currentMode === 'visual' ? 'default' : 'ghost'}
        onClick={() => switchMode('visual')}
        className="flex items-center gap-2"
      >
        <Paintbrush className="h-4 w-4" />
        Visual Editor
        {currentMode === 'visual' && <Badge variant="secondary" className="ml-1">Active</Badge>}
      </Button>
    </div>
  );
}
