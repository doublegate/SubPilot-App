'use client';

import { api } from '@/trpc/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, MessageSquare, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConversationHistoryProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onClose?: () => void;
}

export function ConversationHistory({
  currentConversationId,
  onSelectConversation,
  onClose: _onClose,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get conversations
  const { data, isLoading } = api.assistant.getConversations.useQuery({
    limit: 50,
  });

  // Search conversations
  const { data: searchResults } = api.assistant.searchConversations.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  // Delete conversation
  const deleteConversation = api.assistant.deleteConversation.useMutation({
    onSuccess: () => {
      toast.success('Conversation deleted successfully');
      void utils.assistant.getConversations.invalidate();
      setDeleteId(null);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const conversations =
    searchQuery.length > 2
      ? (searchResults ?? [])
      : (data?.conversations ?? []);

  const handleDelete = (id: string) => {
    deleteConversation.mutate({ conversationId: id });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-8"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="p-2">
            {conversations.map(conv => {
              const isSearchResult = searchQuery.length > 2;
              const conversation = isSearchResult ? conv : conv;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'group relative mb-1 rounded-lg p-3 hover:bg-muted/50',
                    currentConversationId === conversation.id && 'bg-muted'
                  )}
                >
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 overflow-hidden">
                        <h4 className="truncate text-sm font-medium">
                          {conversation.title ?? 'Untitled'}
                        </h4>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {'lastMessage' in conversation
                            ? (conversation.lastMessage?.content ??
                              'No messages')
                            : 'No messages'}
                        </p>
                      </div>
                      <MessageSquare className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(
                          new Date(conversation.lastMessageAt),
                          {
                            addSuffix: true,
                          }
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {'messageCount' in conversation
                          ? conversation.messageCount
                          : (conversation.matchedMessages?.length ?? 0)}{' '}
                        messages
                      </span>
                    </div>
                  </button>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteId(conversation.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Stats */}
      <div className="border-t p-3 text-xs text-muted-foreground">
        {data && (
          <div className="flex justify-between">
            <span>{data.total} conversations</span>
            <span>{data.conversations.length} shown</span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
