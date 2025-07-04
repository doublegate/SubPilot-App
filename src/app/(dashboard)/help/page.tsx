import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  MessageSquare,
  BookOpen,
  Mail,
  ExternalLink,
  ChevronRight,
  FileQuestion,
  Zap,
  CreditCard,
  Shield,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    category: 'Getting Started',
    icon: Zap,
    questions: [
      {
        question: 'How does SubPilot detect my subscriptions?',
        answer:
          'SubPilot connects to your bank accounts through Plaid and automatically analyzes your transactions. We use advanced pattern recognition to identify recurring payments and group them as subscriptions.',
      },
      {
        question: 'Is my financial data secure?',
        answer:
          'Absolutely. We use bank-level encryption and never store your banking credentials. All connections are made through Plaid, a trusted financial services provider used by major banks.',
      },
      {
        question: 'How do I connect my bank account?',
        answer:
          'Click the "Connect Bank" button in your dashboard or navigate to the Banks page. Follow the secure Plaid flow to connect your accounts. Most major US and Canadian banks are supported.',
      },
    ],
  },
  {
    category: 'Subscriptions',
    icon: CreditCard,
    questions: [
      {
        question: 'How accurate is subscription detection?',
        answer:
          'Our detection algorithm has over 95% accuracy for most subscription types. You can always manually add or remove subscriptions if needed.',
      },
      {
        question: 'Can I manually add a subscription?',
        answer:
          'Yes! Click the "Add Subscription" button on your dashboard to manually add any subscription that wasn\'t automatically detected.',
      },
      {
        question: 'How does automated cancellation work?',
        answer:
          'For supported services, we can automate the cancellation process. For others, we provide step-by-step instructions and direct links to cancellation pages.',
      },
    ],
  },
  {
    category: 'Billing & Account',
    icon: Shield,
    questions: [
      {
        question: "What's included in the free plan?",
        answer:
          'The free plan includes 2 bank account connections, basic subscription tracking, manual cancellation assistance, and email notifications.',
      },
      {
        question: 'Can I change my plan anytime?',
        answer:
          "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
      },
      {
        question: 'How do I cancel my SubPilot subscription?',
        answer:
          "You can cancel anytime from your billing settings. We'll keep your data for 30 days in case you change your mind.",
      },
    ],
  },
  {
    category: 'Troubleshooting',
    icon: AlertCircle,
    questions: [
      {
        question: 'My bank connection stopped working',
        answer:
          'Bank connections occasionally need to be refreshed. Go to the Banks page and click "Reconnect" next to the affected bank. This usually resolves the issue.',
      },
      {
        question: 'Some subscriptions are missing',
        answer:
          "Make sure all your bank accounts are connected. Some subscriptions might be paid from accounts you haven't connected yet. You can also manually add missing subscriptions.",
      },
      {
        question: "I'm seeing duplicate subscriptions",
        answer:
          'This can happen if you have multiple payment methods for the same service. You can merge duplicates by clicking on the subscription and selecting "Merge with another."',
      },
    ],
  },
];

const quickLinks = [
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step guides',
    icon: BookOpen,
    href: '#',
    external: true,
  },
  {
    title: 'API Documentation',
    description: 'For developers and integrations',
    icon: FileQuestion,
    href: '#',
    external: true,
  },
  {
    title: 'System Status',
    description: 'Check service availability',
    icon: AlertCircle,
    href: '#',
    external: true,
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="mt-2 text-muted-foreground">
          Get answers to your questions and learn how to make the most of
          SubPilot
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map(link => (
          <Card
            key={link.title}
            className="group transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <link.icon className="h-5 w-5 text-muted-foreground" />
                {link.external && (
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </div>
              <CardTitle className="text-lg">{link.title}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Find answers to common questions about SubPilot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {faqs.map(category => (
              <div key={category.category}>
                <div className="mb-3 flex items-center gap-2">
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{category.category}</h3>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.category}-${index}`}
                    >
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact Support
          </CardTitle>
          <CardDescription>
            Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll help
            you out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="How can we help?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue or question in detail..."
                rows={5}
              />
            </div>
            <Button type="submit" className="w-full md:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
          <CardDescription>
            Here are some other ways to get support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/assistant"
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">AI Assistant</p>
                <p className="text-sm text-muted-foreground">
                  Get instant help from our AI-powered assistant
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">
                  support@subpilot.app • Response within 24 hours
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
