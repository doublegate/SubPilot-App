import { api } from '@/trpc/server';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlaidConfigForm } from '@/components/admin/plaid-config-form';
import { PlaidWebhookConfig } from '@/components/admin/plaid-webhook-config';
import {
  Building,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Activity,
} from 'lucide-react';

async function PlaidStatus() {
  const status = await api.admin.getPlaidStatus();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Environment</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">
            {status.environment}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {status.environment === 'sandbox'
              ? 'Test environment - no real data'
              : 'Production environment - live data'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">API Status</CardTitle>
          {status.isConnected ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {status.isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Last checked: {new Date(status.lastChecked).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connected Items</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status.connectedItems}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {status.activeWebhooks} active webhooks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function SupportedInstitutions() {
  const institutions = await api.admin.getTopInstitutions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Institutions</CardTitle>
        <CardDescription>
          Most commonly connected banks and credit unions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutions.map(inst => (
            <div key={inst.id} className="flex items-center gap-3">
              {inst.logo && (
                <Image
                  src={inst.logo}
                  alt={inst.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{inst.name}</p>
                <p className="text-sm text-muted-foreground">
                  {inst.connectionCount} connections
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PlaidPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Plaid Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage bank integration settings and monitor connections
        </p>
      </div>

      <PlaidStatus />

      <div className="grid gap-8 lg:grid-cols-2">
        <PlaidConfigForm />
        <PlaidWebhookConfig />
      </div>

      <SupportedInstitutions />

      <Card>
        <CardHeader>
          <CardTitle>Plaid Resources</CardTitle>
          <CardDescription>
            Helpful links and documentation for Plaid integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <a
              href="https://dashboard.plaid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Plaid Dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    View API keys, webhooks, and usage
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="https://plaid.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">API Documentation</p>
                  <p className="text-sm text-muted-foreground">
                    Integration guides and API reference
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <button className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Sync All Accounts</p>
                  <p className="text-sm text-muted-foreground">
                    Force refresh all connected bank accounts
                  </p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
