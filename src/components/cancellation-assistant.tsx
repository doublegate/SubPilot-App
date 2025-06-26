'use client';

// import { useState } from 'react';  // TODO: Will be used for step navigation
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface CancellationAssistantProps {
  subscription: {
    id: string;
    name: string;
    provider?: {
      name: string;
      website?: string | null;
    } | null;
    amount: number;
    currency: string;
    frequency: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkCancelled?: (id: string) => void;
}

// Provider-specific cancellation instructions
const cancellationInstructions: Record<
  string,
  {
    difficulty: 'easy' | 'medium' | 'hard';
    methods: {
      type: 'website' | 'phone' | 'email' | 'chat';
      label: string;
      url?: string;
      phone?: string;
      email?: string;
      instructions: string[];
    }[];
    tips: string[];
    retention: string[];
  }
> = {
  netflix: {
    difficulty: 'easy',
    methods: [
      {
        type: 'website',
        label: 'Cancel Online',
        url: 'https://www.netflix.com/youraccount',
        instructions: [
          'Sign in to your Netflix account',
          'Go to Account settings',
          'Click "Cancel Membership"',
          'Confirm cancellation',
        ],
      },
    ],
    tips: [
      'You can continue watching until your billing period ends',
      'Your account will be deleted 10 months after cancellation',
      'You can reactivate anytime with the same email',
    ],
    retention: [
      'Netflix may offer discounted plans',
      'Consider pausing instead of cancelling',
    ],
  },
  spotify: {
    difficulty: 'easy',
    methods: [
      {
        type: 'website',
        label: 'Cancel Online',
        url: 'https://www.spotify.com/account/subscription/',
        instructions: [
          'Log in to your Spotify account',
          'Go to subscription page',
          'Click "Cancel subscription"',
          'Follow the cancellation flow',
        ],
      },
    ],
    tips: [
      'Premium features work until billing period ends',
      'You keep your playlists and saved music',
      'Can resubscribe anytime',
    ],
    retention: [
      'May offer 3 months at discounted rate',
      'Consider family plan if you have multiple users',
    ],
  },
  'amazon prime': {
    difficulty: 'medium',
    methods: [
      {
        type: 'website',
        label: 'Cancel Online',
        url: 'https://www.amazon.com/gp/css/account/info/view.html',
        instructions: [
          'Sign in to your Amazon account',
          'Go to "Manage Your Prime Membership"',
          'Click "End Membership"',
          'Choose end date and confirm',
        ],
      },
    ],
    tips: [
      'You can get a prorated refund if unused',
      'Benefits continue until membership expires',
      'Consider pausing auto-renewal instead',
    ],
    retention: [
      'Amazon may offer monthly instead of yearly',
      'Student discounts may be available',
    ],
  },
  default: {
    difficulty: 'medium',
    methods: [
      {
        type: 'website',
        label: 'Check Provider Website',
        instructions: [
          'Log in to your account on the provider website',
          'Look for Account Settings or Billing section',
          'Find subscription management or cancellation option',
          'Follow the cancellation process',
        ],
      },
      {
        type: 'phone',
        label: 'Call Customer Service',
        instructions: [
          'Find customer service number on provider website',
          'Call during business hours',
          'Have your account information ready',
          'Request subscription cancellation',
          'Get confirmation number',
        ],
      },
      {
        type: 'email',
        label: 'Email Support',
        instructions: [
          'Find customer support email',
          'Include your account details and cancellation request',
          'Mention specific subscription you want to cancel',
          'Request written confirmation',
        ],
      },
    ],
    tips: [
      'Screenshot any confirmation pages',
      'Save cancellation confirmation emails',
      'Check your next bill to ensure cancellation worked',
      'Some services have retention departments',
    ],
    retention: [
      'Be firm but polite if offered alternatives',
      'Ask for the cancellation to be processed immediately',
      'Decline any retention offers if you want to cancel',
    ],
  },
};

export function CancellationAssistant({
  subscription,
  open,
  onOpenChange,
  onMarkCancelled,
}: CancellationAssistantProps) {
  // const [currentStep, setCurrentStep] = useState(0);  // TODO: Implement step navigation

  const providerKey =
    subscription.provider?.name?.toLowerCase().replace(/\s+/g, ' ') ??
    'default';
  const instructions =
    cancellationInstructions[providerKey] ?? cancellationInstructions.default;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/10 text-green-600';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'hard':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cancel {subscription.name}
          </DialogTitle>
          <DialogDescription>
            Step-by-step guide to cancel your subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subscription Summary */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Subscription Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">{subscription.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">
                  {formatCurrency(subscription.amount, subscription.currency)} /{' '}
                  {subscription.frequency.replace('ly', '')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Difficulty:</span>
                <Badge
                  className={getDifficultyColor(
                    instructions?.difficulty ?? 'medium'
                  )}
                >
                  {instructions?.difficulty ?? 'medium'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cancellation Methods</h3>
            {instructions?.methods?.map((method, index) => (
              <Card key={index} className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getMethodIcon(method.type)}
                    {method.label}
                    {method.url && (
                      <Link
                        href={method.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto"
                      >
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Open
                        </Button>
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {method.instructions.map((instruction, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {stepIndex + 1}
                        </span>
                        <span className="text-sm leading-6">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                  {method.phone && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {method.phone}
                      </span>
                    </div>
                  )}
                  {method.email && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {method.email}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips */}
          {(instructions?.tips?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Important Tips
              </h3>
              <ul className="space-y-2">
                {instructions?.tips?.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Retention Warnings */}
          {(instructions?.retention?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Watch Out For
              </h3>
              <ul className="space-y-2">
                {instructions?.retention?.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                After cancelling, mark it as cancelled in SubPilot
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Close Guide
              </Button>
              {onMarkCancelled && (
                <Button
                  onClick={() => {
                    onMarkCancelled(subscription.id);
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  Mark as Cancelled
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
