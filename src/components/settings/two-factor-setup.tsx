'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// Tabs components not currently used but may be needed for future UI enhancements
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Smartphone, Key, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TwoFactorSetup({
  open,
  onOpenChange,
  onSuccess,
}: TwoFactorSetupProps) {
  const [method, setMethod] = useState<'authenticator' | 'sms'>(
    'authenticator'
  );
  const [step, setStep] = useState<'choose' | 'setup' | 'verify' | 'backup'>(
    'choose'
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const { toast } = useToast();
  const utils = api.useUtils();

  // Setup authenticator
  const setupAuthenticator = api.twoFactor.setupAuthenticator.useMutation({
    onSuccess: data => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('verify');
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Verify authenticator
  const verifyAuthenticator =
    api.twoFactor.verifyAndEnableAuthenticator.useMutation({
      onSuccess: data => {
        setBackupCodes(data.backupCodes);
        setStep('backup');
      },
      onError: error => {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

  // Setup SMS
  const setupSMS = api.twoFactor.setupSMS.useMutation({
    onSuccess: data => {
      setStep('verify');
      toast({
        title: 'Code Sent',
        description: data.message,
      });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Verify SMS
  const verifySMS = api.twoFactor.verifyAndEnableSMS.useMutation({
    onSuccess: data => {
      setBackupCodes(data.backupCodes);
      setStep('backup');
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const handleMethodSelect = (selectedMethod: 'authenticator' | 'sms') => {
    setMethod(selectedMethod);
    setStep('setup');

    if (selectedMethod === 'authenticator') {
      setupAuthenticator.mutate();
    }
  };

  const handlePhoneSubmit = () => {
    setupSMS.mutate({ phoneNumber });
  };

  const handleVerify = () => {
    if (method === 'authenticator') {
      verifyAuthenticator.mutate({ secret, code: verificationCode });
    } else {
      verifySMS.mutate({ phoneNumber, code: verificationCode });
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    void navigator.clipboard.writeText(codesText).then(() => {
      setCopiedCodes(true);
      toast({
        title: 'Copied',
        description: 'Backup codes copied to clipboard',
      });
      setTimeout(() => setCopiedCodes(false), 3000);
    });
  };

  const handleComplete = () => {
    void utils.twoFactor.getStatus.invalidate();
    onSuccess?.();
    onOpenChange(false);

    // Reset state
    setStep('choose');
    setVerificationCode('');
    setPhoneNumber('');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose' && 'Enable Two-Factor Authentication'}
            {step === 'setup' &&
              `Set up ${method === 'authenticator' ? 'Authenticator App' : 'SMS Authentication'}`}
            {step === 'verify' && 'Verify Your Setup'}
            {step === 'backup' && 'Save Your Backup Codes'}
          </DialogTitle>
          <DialogDescription>
            {step === 'choose' && 'Choose how you want to secure your account'}
            {step === 'setup' &&
              method === 'authenticator' &&
              'Scan the QR code with your authenticator app'}
            {step === 'setup' &&
              method === 'sms' &&
              'Enter your phone number to receive verification codes'}
            {step === 'verify' && 'Enter the 6-digit code to complete setup'}
            {step === 'backup' &&
              'Save these codes in a safe place. You can use them to access your account if you lose your device.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-4 py-4">
            <button
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left hover:bg-muted/50"
              onClick={() => handleMethodSelect('authenticator')}
            >
              <Shield className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">Authenticator App</h3>
                <p className="text-sm text-muted-foreground">
                  Use an app like Google Authenticator or Authy
                </p>
              </div>
            </button>

            <button
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left hover:bg-muted/50"
              onClick={() => handleMethodSelect('sms')}
            >
              <Smartphone className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">SMS/Text Message</h3>
                <p className="text-sm text-muted-foreground">
                  Receive codes via text message to your phone
                </p>
              </div>
            </button>
          </div>
        )}

        {step === 'setup' && method === 'authenticator' && qrCode && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Image
                src={qrCode}
                alt="2FA QR Code"
                width={200}
                height={200}
                className="rounded-lg border"
              />
            </div>

            <div className="space-y-2">
              <Label>Can&apos;t scan? Enter this code manually:</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                  {secret}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(secret);
                    toast({
                      title: 'Copied',
                      description: 'Secret key copied to clipboard',
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'setup' && method === 'sms' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                We&apos;ll send verification codes to this number
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handlePhoneSubmit}
              disabled={!phoneNumber || setupSMS.isPending}
            >
              {setupSMS.isPending ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={e =>
                  setVerificationCode(e.target.value.replace(/\D/g, ''))
                }
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your{' '}
                {method === 'authenticator'
                  ? 'authenticator app'
                  : 'text message'}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={
                verificationCode.length !== 6 ||
                verifyAuthenticator.isPending ||
                verifySMS.isPending
              }
            >
              {verifyAuthenticator.isPending || verifySMS.isPending
                ? 'Verifying...'
                : 'Verify and Enable'}
            </Button>
          </div>
        )}

        {step === 'backup' && (
          <div className="space-y-4 py-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                Save these backup codes in a secure location. Each code can only
                be used once.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-4">
              {backupCodes.map((code, index) => (
                <code key={index} className="text-sm">
                  {code}
                </code>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={copyBackupCodes}
            >
              {copiedCodes ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Backup Codes
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {step !== 'backup' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === 'backup' && (
            <Button onClick={handleComplete}>I&apos;ve Saved My Codes</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
