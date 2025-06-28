import { redirect } from 'next/navigation';
import { auth } from '~/server/auth';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Shield, Zap, Lock } from 'lucide-react';

export default async function ConnectBankPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="container max-w-4xl py-8">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Connect Your Bank Account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Securely link your bank account to automatically detect and track
            subscriptions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bank Connection</CardTitle>
            <CardDescription>
              We use Plaid to securely connect to your financial institutions.
              Your credentials are never stored on our servers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <PlaidLinkButton className="px-8" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Shield className="mb-2 h-8 w-8 text-cyan-600" />
              <CardTitle className="text-lg">Bank-Level Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted with 256-bit encryption. We never see or
                store your bank credentials.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="mb-2 h-8 w-8 text-purple-600" />
              <CardTitle className="text-lg">Automatic Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your transactions to automatically identify
                recurring subscriptions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="mb-2 h-8 w-8 text-green-600" />
              <CardTitle className="text-lg">Read-Only Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We only have read access to view transactions. We cannot move
                money or make changes.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg bg-muted p-6">
          <h2 className="mb-2 text-lg font-semibold">What happens next?</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Click &quot;Connect Bank Account&quot; to open the secure Plaid
              connection
            </li>
            <li>Log in to your bank using your online banking credentials</li>
            <li>Select the accounts you want to connect</li>
            <li>
              We&apos;ll import your transactions and detect subscriptions
            </li>
            <li>Review and manage your subscriptions from the dashboard</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
