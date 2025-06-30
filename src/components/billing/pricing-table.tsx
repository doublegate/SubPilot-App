'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const PLANS = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started',
    price: { monthly: 0, yearly: 0 },
    features: [
      { name: '2 bank accounts', included: true },
      { name: 'Basic subscription tracking', included: true },
      { name: 'Manual cancellation', included: true },
      { name: 'Email notifications', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'AI Assistant', included: false },
      { name: 'Automated cancellation', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'Export data', included: false },
      { name: 'Priority support', included: false },
    ],
  },
  {
    name: 'pro',
    displayName: 'Professional',
    description: 'For power users who want full control',
    price: { monthly: 9.99, yearly: 99.99 },
    popular: true,
    features: [
      { name: 'Unlimited bank accounts', included: true },
      { name: 'Advanced subscription tracking', included: true },
      { name: 'Automated cancellation', included: true },
      { name: 'Email notifications', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'AI Assistant', included: true },
      { name: 'Predictive insights', included: true },
      { name: 'Export data (CSV/PDF)', included: true },
      { name: 'Priority support', included: true },
      { name: 'Multi-account support', included: false },
    ],
  },
  {
    name: 'team',
    displayName: 'Team',
    description: 'Perfect for families and small teams',
    price: { monthly: 24.99, yearly: 249.99 },
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Multi-account support', included: true },
      { name: 'Up to 5 team members', included: true },
      { name: 'Shared subscriptions view', included: true },
      { name: 'Team analytics', included: true },
      { name: 'Admin controls', included: true },
      { name: 'Audit logs', included: true },
      { name: 'Bulk operations', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'SSO', included: false },
    ],
  },
];

export function PricingTable() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly'
  );
  const [loading, setLoading] = useState<string | null>(null);

  const { data: currentSubscription } = api.billing.getSubscription.useQuery();
  const { data: plans } = api.billing.getPlans.useQuery();

  const createCheckoutSession = api.billing.createCheckoutSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        router.push(data.url);
      }
    },
    onError: error => {
      toast.error(error.message);
      setLoading(null);
    },
  });

  const handleUpgrade = async (planName: string) => {
    const plan = plans?.find(p => p.name === planName);
    if (!plan) return;

    setLoading(planName);
    await createCheckoutSession.mutateAsync({ planId: plan.id });
  };

  const getButtonText = (planName: string) => {
    if (currentSubscription?.plan?.name === planName) {
      return 'Current Plan';
    }
    if (planName === 'free') {
      return 'Downgrade';
    }
    return 'Upgrade';
  };

  const isButtonDisabled = (planName: string) => {
    return currentSubscription?.plan?.name === planName || loading !== null;
  };

  return (
    <div className="space-y-8">
      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <Label htmlFor="billing-period">Monthly</Label>
        <Switch
          id="billing-period"
          checked={billingPeriod === 'yearly'}
          onCheckedChange={checked =>
            setBillingPeriod(checked ? 'yearly' : 'monthly')
          }
        />
        <Label htmlFor="billing-period">
          Yearly
          <Badge variant="secondary" className="ml-2">
            Save 20%
          </Badge>
        </Label>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:gap-8 lg:grid-cols-3 max-w-7xl mx-auto">
        {PLANS.map(plan => (
          <Card
            key={plan.name}
            className={`flex flex-col h-full ${plan.popular ? 'relative border-primary shadow-lg scale-105' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 flex-1">
              {/* Price */}
              <div>
                <div className="flex items-baseline">
                  <span className="text-2xl sm:text-3xl font-bold">
                    ${plan.price[billingPeriod]}
                  </span>
                  <span className="ml-1 text-sm sm:text-base text-muted-foreground">
                    /{billingPeriod === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingPeriod === 'yearly' && plan.price.monthly > 0 && (
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    ${plan.price.monthly}/month billed annually
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map(feature => (
                  <li key={feature.name} className="flex items-start">
                    {feature.included ? (
                      <Check className="mr-3 h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <X className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={
                        feature.included
                          ? ''
                          : 'text-muted-foreground line-through'
                      }
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={isButtonDisabled(plan.name)}
                onClick={() => handleUpgrade(plan.name)}
              >
                {loading === plan.name ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  getButtonText(plan.name)
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include a 14-day free trial. Cancel anytime.</p>
        <p className="mt-1">
          Need a custom plan?{' '}
          <a
            href="mailto:support@subpilot.app"
            className="text-primary hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
