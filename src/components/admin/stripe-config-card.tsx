'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Save, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export function StripeConfigCard() {
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: '',
    webhookSecret: '',
  });

  const handleSave = async () => {
    // TODO: Save via API
    toast.success('Stripe configuration updated');
  };

  const handleTestConnection = async () => {
    // TODO: Test connection
    toast.success('Connection successful!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe API Configuration</CardTitle>
        <CardDescription>
          Configure your Stripe API keys and webhook settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="publishableKey">Publishable Key</Label>
          <Input
            id="publishableKey"
            value={config.publishableKey}
            onChange={(e) =>
              setConfig({ ...config, publishableKey: e.target.value })
            }
            placeholder="pk_test_..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secretKey">Secret Key</Label>
          <div className="relative">
            <Input
              id="secretKey"
              type={showSecret ? 'text' : 'password'}
              value={config.secretKey}
              onChange={(e) =>
                setConfig({ ...config, secretKey: e.target.value })
              }
              placeholder="sk_test_..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhookSecret">Webhook Signing Secret</Label>
          <Input
            id="webhookSecret"
            type="password"
            value={config.webhookSecret}
            onChange={(e) =>
              setConfig({ ...config, webhookSecret: e.target.value })
            }
            placeholder="whsec_..."
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
          <Button variant="outline" onClick={handleTestConnection}>
            <TestTube className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium">Current Mode</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">Test Mode</Badge>
            <span className="text-sm text-muted-foreground">
              Using test API keys
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}