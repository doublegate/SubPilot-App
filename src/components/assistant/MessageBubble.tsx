'use client';

import { type Message } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Bot,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface MessageMetadata {
  actionId?: string;
  [key: string]: unknown;
}

interface MessageBubbleProps {
  message: Message & {
    _count?: {
      assistantActions: number;
    };
  };
  isLoading?: boolean;
  onActionConfirm?: (actionId: string) => void;
}

export function MessageBubble({
  message,
  isLoading = false,
  onActionConfirm: _onActionConfirm,
}: MessageBubbleProps) {
  const utils = api.useUtils();

  // Execute action mutation
  const executeAction = api.assistant.executeAction.useMutation({
    onSuccess: () => {
      toast.success('Action executed successfully');
      void utils.assistant.getConversation.invalidate();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const isUser = message.role === 'user';
  const functionCall = message.functionCall as FunctionCall | null;

  const handleActionConfirm = (actionId: string) => {
    executeAction.mutate({ actionId, confirmed: true });
  };

  const handleActionReject = (_actionId: string) => {
    // You could add a reject endpoint or just update the status
    toast.info('Action cancelled');
  };

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-1 flex-col gap-1', isUser && 'items-end')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isUser ? 'You' : 'SubPilot AI'}</span>
          <span>•</span>
          <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
        </div>

        <Card
          className={cn(
            'max-w-[80%] p-3',
            isUser ? 'text-primary-foreground bg-primary' : 'bg-muted'
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>

              {/* Function Call Card */}
              {functionCall && (
                <Card className="mt-3 border-dashed p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Action Required</span>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {getActionDescription(
                      functionCall.name,
                      functionCall.arguments
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const metadata =
                          message.metadata as MessageMetadata | null;
                        const actionId = metadata?.actionId;
                        if (typeof actionId === 'string')
                          handleActionConfirm(actionId);
                      }}
                      disabled={executeAction.isPending}
                    >
                      {executeAction.isPending ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-3 w-3" />
                      )}
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const metadata =
                          message.metadata as MessageMetadata | null;
                        const actionId = metadata?.actionId;
                        if (typeof actionId === 'string')
                          handleActionReject(actionId);
                      }}
                      disabled={executeAction.isPending}
                    >
                      <XCircle className="mr-2 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function getActionDescription(
  actionName: string,
  args: Record<string, unknown>
): string {
  switch (actionName) {
    case 'cancelSubscription': {
      const subscriptionId =
        typeof args.subscriptionId === 'string'
          ? args.subscriptionId
          : 'unknown';
      const reason =
        typeof args.reason === 'string' ? ` (Reason: ${args.reason})` : '';
      return `Cancel subscription ${subscriptionId}${reason}`;
    }
    case 'analyzeSpending': {
      const timeframe =
        typeof args.timeframe === 'string' ? args.timeframe : 'recent';
      const category =
        typeof args.category === 'string' ? ` for ${args.category}` : '';
      return `Analyze your ${timeframe} spending${category}`;
    }
    case 'findSavings': {
      const threshold =
        typeof args.threshold === 'number' ? ` above $${args.threshold}` : '';
      return `Find savings opportunities${threshold}`;
    }
    case 'setReminder': {
      const reminderType =
        typeof args.reminderType === 'string' ? args.reminderType : 'general';
      const date = args.date
        ? new Date(args.date as string | number | Date).toLocaleDateString()
        : 'unknown date';
      return `Set a ${reminderType} reminder for ${date}`;
    }
    case 'getSubscriptionInfo':
      return `Get detailed information about subscription`;
    case 'explainCharge':
      return `Explain transaction details`;
    case 'suggestAlternatives':
      return `Find cheaper alternatives for this subscription`;
    default:
      return `Execute ${actionName}`;
  }
}
