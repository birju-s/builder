"use client";
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User } from 'lucide-react';

interface ConversationTurn {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface Props {
  projectId: string;
  initialTurns?: ConversationTurn[];
}

export function ConversationThread({ projectId, initialTurns = [] }: Props) {
  const [turns, setTurns] = useState<ConversationTurn[]>(initialTurns);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function handleSendMessage() {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage = inputValue;
    setInputValue('');
    setIsGenerating(true);

    // Add user message to conversation
    const userTurn: ConversationTurn = {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setTurns(prev => [...prev, userTurn]);

    try {
      // Send as follow-up request to the code agent
      const response = await fetch(`/api/projects/${projectId}/iterate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          isFollowUp: turns.length > 0 // This is a follow-up if we have previous turns
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      const result = await response.json();
      
      // Add assistant response
      const assistantTurn: ConversationTurn = {
        id: `assistant-${Date.now()}`,
        role: 'ASSISTANT',
        content: result.summary || 'Generation completed successfully',
        createdAt: new Date().toISOString(),
      };
      setTurns(prev => [...prev, assistantTurn]);

    } catch (error) {
      console.error('Error in conversation:', error);
      const errorTurn: ConversationTurn = {
        id: `error-${Date.now()}`,
        role: 'ASSISTANT',
        content: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setTurns(prev => [...prev, errorTurn]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-96 border rounded-lg">
      {/* Header */}
      <div className="p-3 border-b bg-muted/50">
        <h3 className="font-medium text-sm">Conversation</h3>
        <p className="text-xs text-muted-foreground">
          Ask follow-up questions to refine your project
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {turns.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Start a conversation to iteratively improve your project.
            <br />
            Try: "Make the header blue" or "Add a contact form"
          </div>
        )}
        
        {turns.map((turn) => (
          <div key={turn.id} className="flex gap-3">
            <Avatar className="h-6 w-6 mt-1">
              <AvatarFallback className="text-xs">
                {turn.role === 'USER' ? <User size={12} /> : <Bot size={12} />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="text-xs text-muted-foreground">
                {turn.role === 'USER' ? 'You' : 'Assistant'}
              </div>
              <Card className="bg-muted/30">
                <CardContent className="p-2 text-sm">
                  {turn.content}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex gap-3">
            <Avatar className="h-6 w-6 mt-1">
              <AvatarFallback className="text-xs">
                <Bot size={12} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">Assistant</div>
              <Card className="bg-muted/30">
                <CardContent className="p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    Generating...
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Refine your project..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isGenerating}
          />
          <Button 
            size="sm" 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isGenerating}
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
