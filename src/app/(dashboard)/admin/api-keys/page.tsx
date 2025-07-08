import { Suspense } from 'react';
import { api } from '@/trpc/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  RefreshCw,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Webhook,
  TestTube,
  AlertTriangle,
  Calendar,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKeyConfig {
  name: string;
  key: string;
  masked: boolean;
  isActive: boolean;
  lastUsed: Date | null;
  expiresAt: Date | null;
  usage: {
    count: number;
    limit: number | null;
  };
}

async function ApiKeysDashboard() {
  const [apiKeys, webhooks, usageStats] = await Promise.all([
    api.admin.getApiKeys(),
    api.admin.getWebhooks(),
    api.admin.getApiUsageStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* API Key Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.filter(k => k.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat().format(usageStats.totalCalls)}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.successRate}%</div>
            <p className="text-xs text-muted-foreground">API reliability</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks.filter(w => w.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Active endpoints</p>
          </CardContent>
        </Card>
      </div>

      {/* Plaid Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plaid API</CardTitle>
              <CardDescription>
                Bank connection and transaction sync
              </CardDescription>
            </div>
            <Badge variant={apiKeys.find(k => k.name === 'Plaid')?.isActive ? 'default' : 'secondary'}>
              {apiKeys.find(k => k.name === 'Plaid')?.isActive ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value="••••••••••••••••"
                    readOnly
                    className="font-mono"
                  />
                  <Button size="icon" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value="••••••••••••••••"
                    readOnly
                    className="font-mono"
                  />
                  <Button size="icon" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Environment</p>
                <p className="text-sm text-muted-foreground">sandbox</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <TestTube className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rotate Keys
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Used</span>
                <span>2 minutes ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Calls (24h)</span>
                <span>1,523</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate</span>
                <span>99.8%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stripe API</CardTitle>
              <CardDescription>
                Payment processing and billing
              </CardDescription>
            </div>
            <Badge variant={apiKeys.find(k => k.name === 'Stripe')?.isActive ? 'default' : 'secondary'}>
              {apiKeys.find(k => k.name === 'Stripe')?.isActive ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Publishable Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value="pk_test_••••••••••••"
                    readOnly
                    className="font-mono"
                  />
                  <Button size="icon" variant="ghost">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value="••••••••••••••••"
                    readOnly
                    className="font-mono"
                  />
                  <Button size="icon" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Mode</p>
                <p className="text-sm text-muted-foreground">Test Mode</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <TestTube className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rotate Keys
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Used</span>
                <span>15 minutes ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payments (24h)</span>
                <span>89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate</span>
                <span>98.9%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SendGrid Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SendGrid API</CardTitle>
              <CardDescription>
                Email notifications and alerts
              </CardDescription>
            </div>
            <Badge variant={apiKeys.find(k => k.name === 'SendGrid')?.isActive ? 'default' : 'secondary'}>
              {apiKeys.find(k => k.name === 'SendGrid')?.isActive ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value="••••••••••••••••"
                  readOnly
                  className="font-mono"
                />
                <Button size="icon" variant="ghost">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">From Email</p>
                <p className="text-sm text-muted-foreground">notifications@subpilot.app</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <TestTube className="mr-2 h-4 w-4" />
                  Send Test Email
                </Button>
                <Button size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rotate Key
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emails Sent (24h)</span>
                <span>234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Rate</span>
                <span>99.1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Rate</span>
                <span>42.3%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
          <CardDescription>
            Configure webhook URLs for external services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {webhooks.map(webhook => (
              <div
                key={webhook.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{webhook.service}</p>
                    {webhook.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {webhook.url}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last triggered: {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Usage by Service */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage Statistics</CardTitle>
          <CardDescription>
            Usage breakdown by service (last 7 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usageStats.byService.map(service => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-muted-foreground">
                    {new Intl.NumberFormat().format(service.calls)} calls
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${(service.calls / Math.max(...usageStats.byService.map(s => s.calls))) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">API Keys Management</h1>
        <p className="mt-2 text-muted-foreground">
          Configure and monitor external service integrations
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        }
      >
        <ApiKeysDashboard />
      </Suspense>
    </div>
  );
}