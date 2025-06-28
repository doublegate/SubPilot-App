'use client';

import { useAssistant } from '@/components/assistant';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  MessageCircle,
  TrendingDown,
  Search,
  AlertTriangle,
  HelpCircle,
  DollarSign,
} from 'lucide-react';

const examplePrompts = [
  {
    icon: TrendingDown,
    title: 'Find Savings',
    description:
      'Identify unused subscriptions and opportunities to save money',
    prompt: 'Help me find ways to save money on my subscriptions',
  },
  {
    icon: Search,
    title: 'Analyze Spending',
    description: 'Get insights into your subscription spending patterns',
    prompt: 'Analyze my subscription spending for this month',
  },
  {
    icon: AlertTriangle,
    title: 'Price Increases',
    description: 'Check if any subscriptions have increased in price',
    prompt: 'Have any of my subscriptions increased in price recently?',
  },
  {
    icon: HelpCircle,
    title: 'Cancel Subscription',
    description: 'Get help cancelling a specific subscription',
    prompt: 'I need help cancelling a subscription',
  },
  {
    icon: DollarSign,
    title: 'Budget Analysis',
    description: 'See how your subscriptions fit into your budget',
    prompt: 'How much am I spending on subscriptions compared to my budget?',
  },
  {
    icon: MessageCircle,
    title: 'General Help',
    description: 'Ask any question about your subscriptions',
    prompt: 'What can you help me with regarding my subscriptions?',
  },
];

export default function AssistantPage() {
  const { openAssistant } = useAssistant();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Your personal subscription management assistant powered by AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How can I help you today?</CardTitle>
          <CardDescription>
            Click on any example below to start a conversation with your AI
            assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {examplePrompts.map(example => {
              const Icon = example.icon;
              return (
                <button
                  key={example.title}
                  onClick={() => openAssistant(example.prompt)}
                  className="flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{example.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {example.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistant Capabilities</CardTitle>
          <CardDescription>
            Your AI assistant can help you with various subscription management
            tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-medium">💡 Smart Analysis</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Analyze spending patterns and trends</li>
              <li>Identify unused or underutilized subscriptions</li>
              <li>Find opportunities to save money</li>
              <li>Compare subscription costs across categories</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-2 font-medium">🎯 Actionable Insights</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Get personalized recommendations</li>
              <li>Receive alerts about price changes</li>
              <li>Track subscription usage and value</li>
              <li>Budget optimization suggestions</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-2 font-medium">🤝 Subscription Management</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Help with cancellation processes</li>
              <li>Find cheaper alternatives</li>
              <li>Set reminders for important dates</li>
              <li>Export subscription data</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => openAssistant()} className="gap-2">
          <MessageCircle className="h-5 w-5" />
          Open AI Assistant
        </Button>
      </div>
    </div>
  );
}
