'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles, TrendingUp, Users, Download } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredPlan?: string;
}

const PLAN_FEATURES = {
  pro: {
    title: 'Upgrade to Professional',
    price: '$9.99/month',
    features: [
      {
        icon: Sparkles,
        title: 'AI Assistant',
        description: 'Get personalized insights and recommendations',
      },
      {
        icon: TrendingUp,
        title: 'Advanced Analytics',
        description: 'Deep dive into your spending patterns',
      },
      {
        icon: Download,
        title: 'Export Data',
        description: 'Download your data in CSV or PDF format',
      },
    ],
  },
  team: {
    title: 'Upgrade to Team',
    price: '$24.99/month',
    features: [
      {
        icon: Users,
        title: 'Multi-Account Support',
        description: 'Share subscriptions with family or team members',
      },
      {
        icon: TrendingUp,
        title: 'Team Analytics',
        description: 'See spending across all team members',
      },
      {
        icon: Sparkles,
        title: 'Everything in Pro',
        description: 'Plus all Professional features',
      },
    ],
  },
};

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredPlan = 'pro',
}: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: plans } = api.billing.getPlans.useQuery();

  const createCheckoutSession = api.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        router.push(data.url);
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setLoading(false);
    },
  });

  const handleUpgrade = async () => {
    const plan = plans?.find(p => p.name === requiredPlan);
    if (!plan) {
      toast.error('Plan not found');
      return;
    }

    setLoading(true);
    await createCheckoutSession.mutateAsync({ planId: plan.id });
  };

  const planInfo = PLAN_FEATURES[requiredPlan as keyof typeof PLAN_FEATURES];

  if (!planInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{planInfo.title}</DialogTitle>
          <DialogDescription>
            {feature
              ? `The "${feature}" feature requires a ${requiredPlan} subscription.`
              : `Unlock premium features with our ${requiredPlan} plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <span className="text-3xl font-bold">{planInfo.price}</span>
            <span className="text-muted-foreground"> per month</span>
          </div>

          <div className="space-y-3">
            {planInfo.features.map((feature, index) => (
              <div key={index} className="flex gap-3">
                <feature.icon className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            14-day free trial • Cancel anytime
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Start Free Trial'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}