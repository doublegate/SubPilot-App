'use client';

import { useState, useEffect } from 'react';
import { api } from '@/trpc/react';
import { UpgradeModal } from './upgrade-modal';
import { Loader2 } from 'lucide-react';

interface PremiumFeatureGateProps {
  feature: string;
  action?:
    | 'add_bank_account'
    | 'invite_team_member'
    | 'use_ai_assistant'
    | 'export_data';
  requiredPlan?: 'pro' | 'team' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onAccessDenied?: () => void;
}

export function PremiumFeatureGate({
  feature,
  requiredPlan = 'pro',
  children,
  fallback,
  onAccessDenied,
}: PremiumFeatureGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: hasAccess, isLoading } = api.billing.hasFeature.useQuery({
    feature,
  });

  const { data: canPerform } = api.billing.canPerformAction.useQuery(
    {
      action: feature as
        | 'export_data'
        | 'add_bank_account'
        | 'invite_team_member'
        | 'use_ai_assistant',
    },
    {
      enabled: hasAccess === false,
    }
  );

  useEffect(() => {
    if (hasAccess === false && onAccessDenied) {
      onAccessDenied();
    }
  }, [hasAccess, onAccessDenied]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    const handleClick = () => {
      setShowUpgradeModal(true);
    };

    return (
      <>
        {fallback ? (
          <button
            onClick={handleClick}
            className="w-full cursor-pointer border-none bg-transparent p-0 text-left"
            aria-label="Upgrade to access premium feature"
            type="button"
          >
            {fallback}
          </button>
        ) : null}

        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature={feature}
          requiredPlan={
            (canPerform?.upgradeRequired as 'pro' | 'team' | 'enterprise') ||
            requiredPlan
          }
        />
      </>
    );
  }

  return <>{children}</>;
}

// Hook for programmatic feature checking
export function useFeatureAccess(feature: string) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: hasAccess, isLoading } = api.billing.hasFeature.useQuery({
    feature,
  });

  const { data: canPerform } = api.billing.canPerformAction.useQuery(
    {
      action: feature as
        | 'export_data'
        | 'add_bank_account'
        | 'invite_team_member'
        | 'use_ai_assistant',
    },
    {
      enabled: hasAccess === false,
    }
  );

  const checkAccess = () => {
    if (!hasAccess) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  return {
    hasAccess: hasAccess ?? false,
    isLoading,
    checkAccess,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeRequired: canPerform?.upgradeRequired,
    reason: canPerform?.reason,
  };
}
