'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function PlaidWebhookConfig() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/plaid`;

  const webhookEvents = [
    {
      name: 'TRANSACTIONS_SYNC',
      status: 'required',
      description: 'Transaction updates',
    },
    {
      name: 'ITEM_ERROR',
      status: 'required',
      description: 'Connection errors',
    },
    {
      name: 'PENDING_EXPIRATION',
      status: 'recommended',
      description: 'Token expiration warnings',
    },
    {
      name: 'USER_PERMISSION_REVOKED',
      status: 'recommended',
      description: 'Permission changes',
    },
    {
      name: 'WEBHOOK_UPDATE_ACKNOWLEDGED',
      status: 'optional',
      description: 'Webhook confirmations',
    },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Configuration</CardTitle>
        <CardDescription>
          Configure Plaid webhooks for real-time updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Webhook Endpoint</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">
              {webhookUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Required Events</p>
          <div className="space-y-2">
            {webhookEvents.map(event => (
              <div
                key={event.name}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div>
                  <p className="text-sm font-medium">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.description}
                  </p>
                </div>
                <Badge
                  variant={
                    event.status === 'required'
                      ? 'default'
                      : event.status === 'recommended'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {event.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <a
          href="https://dashboard.plaid.com/developers/webhooks"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Configure in Plaid Dashboard
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
