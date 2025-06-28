'use client';

import { Button } from '@/components/ui/button';
import { 
  TrendingDown, 
  Search, 
  DollarSign, 
  AlertTriangle,
  BarChart,
  HelpCircle 
} from 'lucide-react';

interface QuickActionsProps {
  onSelectAction: (message: string) => void;
}

const quickActions = [
  {
    icon: TrendingDown,
    label: 'Find savings',
    message: 'Help me find ways to save money on my subscriptions',
    color: 'text-green-600',
  },
  {
    icon: Search,
    label: 'Unused subscriptions',
    message: 'Show me subscriptions I haven\'t used recently',
    color: 'text-orange-600',
  },
  {
    icon: DollarSign,
    label: 'Analyze spending',
    message: 'Analyze my subscription spending for this month',
    color: 'text-blue-600',
  },
  {
    icon: AlertTriangle,
    label: 'Price increases',
    message: 'Have any of my subscriptions increased in price?',
    color: 'text-red-600',
  },
  {
    icon: BarChart,
    label: 'Category breakdown',
    message: 'Show me a breakdown of my subscriptions by category',
    color: 'text-purple-600',
  },
  {
    icon: HelpCircle,
    label: 'Cancel help',
    message: 'I need help cancelling a subscription',
    color: 'text-gray-600',
  },
];

export function QuickActions({ onSelectAction }: QuickActionsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto justify-start p-3 text-left"
            onClick={() => onSelectAction(action.message)}
          >
            <Icon className={`mr-3 h-5 w-5 shrink-0 ${action.color}`} />
            <div className="text-sm">
              <div className="font-medium">{action.label}</div>
              <div className="text-xs text-muted-foreground">
                {action.message.substring(0, 40)}...
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}