'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';
import { ConversationHistory } from './ConversationHistory';
import { Loader2, Send, X, Menu, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function AssistantChat({
  isOpen,
  onClose,
  initialMessage,
}: AssistantChatProps) {
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();

  // Start conversation mutation
  const startConversation = api.assistant.startConversation.useMutation({
    onSuccess: data => {
      setConversationId(data.id);
      void utils.assistant.getConversations.invalidate();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Send message mutation
  const sendMessage = api.assistant.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      void utils.assistant.getConversation.invalidate({
        conversationId: conversationId!,
      });
      scrollToBottom();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Get conversation query
  const { data: conversation, isLoading: conversationLoading } =
    api.assistant.getConversation.useQuery(
      { conversationId: conversationId! },
      { enabled: !!conversationId }
    );

  // Handle initial message
  useEffect(() => {
    if (isOpen && initialMessage && !conversationId) {
      void startConversation.mutate({ initialMessage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMessage, conversationId]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    if (!conversationId) {
      startConversation.mutate({ initialMessage: message });
    } else {
      sendMessage.mutate({ conversationId, message });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessage('');
    setShowHistory(false);
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    setShowHistory(false);
  };

  const toggleHistory = useCallback(() => {
    setShowHistory(!showHistory);
  }, [showHistory]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="relative flex h-[600px] w-full max-w-2xl flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHistory}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">SubPilot AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewConversation}
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation History Sidebar */}
          {showHistory && (
            <div className="w-64 border-r">
              <ConversationHistory
                currentConversationId={conversationId}
                onSelectConversation={handleSelectConversation}
                onClose={() => setShowHistory(false)}
              />
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex flex-1 flex-col">
            {/* Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              {conversationLoading && !conversation ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : conversation ? (
                <div className="space-y-4">
                  {conversation.messages?.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onActionConfirm={actionId => {
                        // Handle action confirmation
                        console.log('Confirm action:', actionId);
                      }}
                    />
                  ))}
                  {sendMessage.isPending && (
                    <MessageBubble
                      message={{
                        id: 'pending',
                        role: 'assistant',
                        content: '',
                        createdAt: new Date(),
                        conversationId: conversationId!,
                        metadata: {},
                        functionCall: null,
                        toolCalls: [],
                      }}
                      isLoading
                    />
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4">
                  <h3 className="text-lg font-medium">
                    How can I help you today?
                  </h3>
                  <QuickActions onSelectAction={setMessage} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your subscriptions..."
                  disabled={
                    sendMessage.isPending || startConversation.isPending
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !message.trim() ||
                    sendMessage.isPending ||
                    startConversation.isPending
                  }
                  size="icon"
                >
                  {sendMessage.isPending || startConversation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                SubPilot AI can help you analyze spending, find savings, and
                manage subscriptions.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
