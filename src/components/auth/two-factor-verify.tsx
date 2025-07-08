'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TwoFactorVerifyProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function TwoFactorVerify({
  onSuccess,
  redirectTo = '/dashboard',
}: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const verifyCode = api.twoFactor.verifyCode.useMutation({
    onSuccess: data => {
      if (data.isBackupCode && data.remainingBackupCodes !== undefined) {
        toast({
          title: 'Backup Code Used',
          description: `You have ${data.remainingBackupCodes} backup codes remaining`,
        });
      }

      // Redirect to dashboard or custom URL
      onSuccess?.();
      router.push(redirectTo);
    },
    onError: err => {
      setError(err.message);
      setCode('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    verifyCode.mutate({ code });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app or use a backup
            code
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={e =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
                }
                className="text-center text-2xl tracking-widest"
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter your 6-digit code or 8-character backup code
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={code.length < 6 || verifyCode.isPending}
            >
              {verifyCode.isPending ? 'Verifying...' : 'Verify'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
