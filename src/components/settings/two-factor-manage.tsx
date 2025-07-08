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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TwoFactorManageProps {
  method: string | null;
  phone: string | null;
  onDisabled?: () => void;
}

export function TwoFactorManage({
  method,
  phone,
  onDisabled,
}: TwoFactorManageProps) {
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  const { toast } = useToast();
  const utils = api.useUtils();

  // Disable 2FA
  const disable2FA = api.twoFactor.disable.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled',
      });
      setShowDisableDialog(false);
      void utils.twoFactor.getStatus.invalidate();
      onDisabled?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Regenerate backup codes
  const regenerateCodes = api.twoFactor.regenerateBackupCodes.useMutation({
    onSuccess: data => {
      setNewBackupCodes(data.backupCodes);
      toast({
        title: 'Success',
        description: 'New backup codes generated',
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

  const handleDisable = () => {
    disable2FA.mutate({ code: verificationCode });
  };

  const handleRegenerateCodes = () => {
    regenerateCodes.mutate({ currentCode: verificationCode });
  };

  const copyBackupCodes = () => {
    const codesText = newBackupCodes.join('\n');
    void navigator.clipboard.writeText(codesText).then(() => {
      toast({
        title: 'Copied',
        description: 'Backup codes copied to clipboard',
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-600" />
          <div>
            <p className="font-medium">Two-Factor Authentication Enabled</p>
            <p className="text-sm text-muted-foreground">
              {method === 'authenticator' && 'Using authenticator app'}
              {method === 'sms' && `Using SMS to ${phone}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowRegenerateDialog(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate Backup Codes
        </Button>

        <Button
          variant="destructive"
          onClick={() => setShowDisableDialog(true)}
        >
          Disable 2FA
        </Button>
      </div>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              This will make your account less secure. Enter your current 2FA
              code to confirm.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disabling 2FA will remove an important security layer from your
              account.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="disable-code">Verification Code</Label>
            <Input
              id="disable-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verificationCode}
              onChange={e =>
                setVerificationCode(e.target.value.replace(/\D/g, ''))
              }
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setVerificationCode('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={verificationCode.length !== 6 || disable2FA.isPending}
            >
              {disable2FA.isPending ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              Generate new backup codes. Your old codes will no longer work.
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes.length === 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="regen-code">Current Verification Code</Label>
                <Input
                  id="regen-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e =>
                    setVerificationCode(e.target.value.replace(/\D/g, ''))
                  }
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setVerificationCode('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateCodes}
                  disabled={
                    verificationCode.length !== 6 || regenerateCodes.isPending
                  }
                >
                  {regenerateCodes.isPending
                    ? 'Generating...'
                    : 'Generate New Codes'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  Save these backup codes in a secure location. Each code can
                  only be used once.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-4">
                {newBackupCodes.map((code, index) => (
                  <code key={index} className="text-sm">
                    {code}
                  </code>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={copyBackupCodes}>
                  Copy Codes
                </Button>
                <Button
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setVerificationCode('');
                    setNewBackupCodes([]);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
