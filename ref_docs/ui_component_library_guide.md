# Radix UI Component Library Guide for SubPilot

## Overview

This guide demonstrates how to effectively use Radix UI to build a consistent, accessible, and beautiful interface for SubPilot. It covers component patterns, theming strategies, accessibility best practices, and custom component development.

## Design System Foundation

### Theme Configuration

```typescript
// app/layout.tsx - Root theme setup
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Theme
          accentColor="blue"      // Primary brand color
          grayColor="slate"       // Neutral color palette
          radius="medium"         // Border radius consistency
          scaling="100%"          // Default scaling
          panelBackground="solid" // Panel styling
        >
          {children}
        </Theme>
      </body>
    </html>
  );
}
```

### Custom Theme Tokens

```css
/* styles/theme.css - Custom CSS properties */
.radix-themes {
  /* Financial application specific colors */
  --color-success: #10b981;
  --color-warning: #f59e0b; 
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  
  /* Subscription status colors */
  --color-subscription-active: #10b981;
  --color-subscription-paused: #f59e0b;
  --color-subscription-cancelled: #6b7280;
  --color-subscription-overdue: #ef4444;
  
  /* Financial amounts */
  --color-amount-positive: #10b981;
  --color-amount-negative: #ef4444;
  --color-amount-neutral: #6b7280;
  
  /* Custom spacing for financial layouts */
  --space-financial-gap: var(--space-4);
  --space-card-padding: var(--space-5);
  
  /* Typography scales for financial data */
  --font-size-amount-large: 2rem;
  --font-size-amount-medium: 1.5rem;
  --font-size-amount-small: 1rem;
  --font-weight-amount: 600;
}
```

## Component Patterns

### Financial Amount Display

```typescript
// components/ui/AmountDisplay.tsx
import { Text, Flex } from '@radix-ui/themes';
import { cn } from '../../utils/cn';

interface AmountDisplayProps {
  amount: number;
  currency?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({
  amount,
  currency = 'USD',
  size = 'medium',
  variant = 'default',
  showSign = false,
  className,
}: AmountDisplayProps) {
  const formatAmount = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });
    
    if (showSign && value > 0) {
      return `+${formatter.format(value)}`;
    }
    
    return formatter.format(value);
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'positive': return 'green';
      case 'negative': return 'red';
      case 'neutral': return 'gray';
      default: return undefined;
    }
  };

  const getSizeProps = () => {
    switch (size) {
      case 'large': return { size: '6', weight: 'bold' } as const;
      case 'medium': return { size: '4', weight: 'medium' } as const;
      case 'small': return { size: '2', weight: 'medium' } as const;
    }
  };

  return (
    <Text
      {...getSizeProps()}
      color={getVariantColor()}
      className={cn('font-mono tabular-nums', className)}
    >
      {formatAmount(amount)}
    </Text>
  );
}
```

### Subscription Status Badge

```typescript
// components/ui/SubscriptionStatusBadge.tsx
import { Badge } from '@radix-ui/themes';
import { PlayIcon, PauseIcon, Cross2Icon } from '@radix-ui/react-icons';

interface SubscriptionStatusBadgeProps {
  status: 'active' | 'paused' | 'cancelled';
  size?: '1' | '2' | '3';
}

export function SubscriptionStatusBadge({ 
  status, 
  size = '2' 
}: SubscriptionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          color: 'green' as const,
          icon: <PlayIcon />,
          label: 'Active',
        };
      case 'paused':
        return {
          color: 'orange' as const,
          icon: <PauseIcon />,
          label: 'Paused',
        };
      case 'cancelled':
        return {
          color: 'gray' as const,
          icon: <Cross2Icon />,
          label: 'Cancelled',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge color={config.color} size={size} variant="soft">
      {config.icon}
      {config.label}
    </Badge>
  );
}
```

### Financial Card Components

```typescript
// components/ui/FinancialCard.tsx
import { Card, Flex, Text, Heading } from '@radix-ui/themes';
import { cn } from '../../utils/cn';

interface FinancialCardProps {
  title: string;
  amount: number;
  currency?: string;
  subtitle?: string;
  trend?: {
    value: number;
    period: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  children?: React.ReactNode;
}

export function FinancialCard({
  title,
  amount,
  currency = 'USD',
  subtitle,
  trend,
  variant = 'default',
  className,
  children,
}: FinancialCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-l-4 border-l-green-500 bg-green-50/50';
      case 'warning':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/50';
      case 'danger':
        return 'border-l-4 border-l-red-500 bg-red-50/50';
      default:
        return '';
    }
  };

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up': return 'green';
      case 'down': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Card className={cn('p-6', getVariantStyles(), className)}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start">
          <Heading size="3" color="gray">
            {title}
          </Heading>
          {trend && (
            <Text size="1" color={getTrendColor()}>
              {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}{' '}
              {Math.abs(trend.value)}% {trend.period}
            </Text>
          )}
        </Flex>
        
        <AmountDisplay
          amount={amount}
          currency={currency}
          size="large"
          variant={variant === 'danger' ? 'negative' : variant === 'success' ? 'positive' : 'default'}
        />
        
        {subtitle && (
          <Text size="2" color="gray">
            {subtitle}
          </Text>
        )}
        
        {children}
      </Flex>
    </Card>
  );
}
```

### Data Visualization Components

```typescript
// components/charts/SpendingChart.tsx
import { Card, Flex, Text, Heading } from '@radix-ui/themes';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface SpendingChartProps {
  data: Array<{
    month: string;
    amount: number;
    subscriptions: number;
  }>;
  title?: string;
}

export function SpendingChart({ data, title = 'Monthly Spending' }: SpendingChartProps) {
  const formatTooltip = (value: number, name: string) => {
    if (name === 'amount') {
      return [
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value),
        'Spending',
      ];
    }
    return [value, 'Subscriptions'];
  };

  return (
    <Card className="p-6">
      <Flex direction="column" gap="4">
        <Heading size="4">{title}</Heading>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelStyle={{ color: 'var(--gray-12)' }}
                contentStyle={{
                  backgroundColor: 'var(--color-panel-solid)',
                  border: '1px solid var(--gray-6)',
                  borderRadius: 'var(--radius-2)',
                }}
              />
              <Bar 
                dataKey="amount" 
                fill="var(--accent-9)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Flex>
    </Card>
  );
}
```

## Form Components

### Financial Form Components

```typescript
// components/forms/SubscriptionForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, Flex, Text, Button, TextField, Select, TextArea,
  Separator, Grid, Label, Callout
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';

const subscriptionSchema = z.object({
  name: z.string().min(1, 'Subscription name is required'),
  amount: z.number().positive('Amount must be positive'),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  category: z.string().optional(),
  nextPayment: z.string().min(1, 'Next payment date is required'),
  notes: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface SubscriptionFormProps {
  initialData?: Partial<SubscriptionFormData>;
  onSubmit: (data: SubscriptionFormData) => void;
  isLoading?: boolean;
}

export function SubscriptionForm({
  initialData,
  onSubmit,
  isLoading = false,
}: SubscriptionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: initialData,
  });

  const amount = watch('amount');
  const frequency = watch('frequency');

  const calculateMonthlyAmount = () => {
    if (!amount || !frequency) return 0;
    
    switch (frequency) {
      case 'WEEKLY': return amount * 4.33;
      case 'MONTHLY': return amount;
      case 'QUARTERLY': return amount / 3;
      case 'YEARLY': return amount / 12;
      default: return amount;
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex direction="column" gap="6">
          <Flex direction="column" gap="2">
            <Label htmlFor="name">Subscription Name</Label>
            <TextField.Input
              id="name"
              {...register('name')}
              placeholder="Netflix, Spotify, etc."
              color={errors.name ? 'red' : undefined}
            />
            {errors.name && (
              <Text size="1" color="red">
                {errors.name.message}
              </Text>
            )}
          </Flex>

          <Grid columns="2" gap="4">
            <Flex direction="column" gap="2">
              <Label htmlFor="amount">Amount</Label>
              <TextField.Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
                color={errors.amount ? 'red' : undefined}
              />
              {errors.amount && (
                <Text size="1" color="red">
                  {errors.amount.message}
                </Text>
              )}
            </Flex>

            <Flex direction="column" gap="2">
              <Label htmlFor="frequency">Billing Frequency</Label>
              <Select.Root
                onValueChange={(value) => setValue('frequency', value as any)}
                defaultValue={initialData?.frequency}
              >
                <Select.Trigger id="frequency" />
                <Select.Content>
                  <Select.Item value="WEEKLY">Weekly</Select.Item>
                  <Select.Item value="MONTHLY">Monthly</Select.Item>
                  <Select.Item value="QUARTERLY">Quarterly</Select.Item>
                  <Select.Item value="YEARLY">Yearly</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Grid>

          {amount && frequency && (
            <Callout.Root color="blue" variant="soft">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Monthly equivalent: <AmountDisplay amount={calculateMonthlyAmount()} />
              </Callout.Text>
            </Callout.Root>
          )}

          <Grid columns="2" gap="4">
            <Flex direction="column" gap="2">
              <Label htmlFor="category">Category</Label>
              <Select.Root
                onValueChange={(value) => setValue('category', value)}
                defaultValue={initialData?.category}
              >
                <Select.Trigger id="category" placeholder="Select category" />
                <Select.Content>
                  <Select.Item value="Entertainment">Entertainment</Select.Item>
                  <Select.Item value="Productivity">Productivity</Select.Item>
                  <Select.Item value="Health">Health & Fitness</Select.Item>
                  <Select.Item value="Education">Education</Select.Item>
                  <Select.Item value="News">News & Media</Select.Item>
                  <Select.Item value="Other">Other</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <Label htmlFor="nextPayment">Next Payment Date</Label>
              <TextField.Input
                id="nextPayment"
                type="date"
                {...register('nextPayment')}
                color={errors.nextPayment ? 'red' : undefined}
              />
              {errors.nextPayment && (
                <Text size="1" color="red">
                  {errors.nextPayment.message}
                </Text>
              )}
            </Flex>
          </Grid>

          <Flex direction="column" gap="2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <TextArea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this subscription..."
              resize="vertical"
            />
          </Flex>

          <Separator />

          <Flex gap="3" justify="end">
            <Button type="button" variant="soft" color="gray">
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {initialData ? 'Update' : 'Create'} Subscription
            </Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}
```

### Budget Form Component

```typescript
// components/forms/BudgetForm.tsx
import { Card, Flex, Text, Button, TextField, Select, Switch, Grid, Label } from '@radix-ui/themes';
import { useForm, Controller } from 'react-hook-form';

interface BudgetFormData {
  name: string;
  amount: number;
  category?: string;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  alertThresholds: number[];
  isActive: boolean;
}

export function BudgetForm() {
  const { register, handleSubmit, control, watch } = useForm<BudgetFormData>({
    defaultValues: {
      alertThresholds: [50, 80, 100],
      isActive: true,
    },
  });

  const amount = watch('amount');
  const period = watch('period');

  return (
    <Card className="p-6">
      <form>
        <Flex direction="column" gap="6">
          <Text size="5" weight="bold">Create Budget</Text>
          
          <Grid columns="2" gap="4">
            <Flex direction="column" gap="2">
              <Label>Budget Name</Label>
              <TextField.Input
                {...register('name')}
                placeholder="Dining Out, Entertainment, etc."
              />
            </Flex>
            
            <Flex direction="column" gap="2">
              <Label>Category</Label>
              <Select.Root>
                <Select.Trigger placeholder="Select category" />
                <Select.Content>
                  <Select.Item value="dining">Dining & Restaurants</Select.Item>
                  <Select.Item value="entertainment">Entertainment</Select.Item>
                  <Select.Item value="shopping">Shopping</Select.Item>
                  <Select.Item value="transport">Transportation</Select.Item>
                  <Select.Item value="utilities">Utilities</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Grid>

          <Grid columns="2" gap="4">
            <Flex direction="column" gap="2">
              <Label>Budget Amount</Label>
              <TextField.Input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </Flex>
            
            <Flex direction="column" gap="2">
              <Label>Period</Label>
              <Select.Root>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="WEEKLY">Weekly</Select.Item>
                  <Select.Item value="MONTHLY">Monthly</Select.Item>
                  <Select.Item value="QUARTERLY">Quarterly</Select.Item>
                  <Select.Item value="YEARLY">Yearly</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Grid>

          <Flex direction="column" gap="3">
            <Label>Alert Thresholds (%)</Label>
            <Grid columns="3" gap="3">
              <TextField.Input placeholder="50%" size="2" />
              <TextField.Input placeholder="80%" size="2" />
              <TextField.Input placeholder="100%" size="2" />
            </Grid>
            <Text size="1" color="gray">
              Get notified when you reach these percentages of your budget
            </Text>
          </Flex>

          <Flex asChild justify="between" align="center">
            <label>
              <Text>Active Budget</Text>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </label>
          </Flex>

          <Flex gap="3" justify="end">
            <Button variant="soft" color="gray">Cancel</Button>
            <Button>Create Budget</Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}
```

## Navigation Components

### Sidebar Navigation

```typescript
// components/navigation/Sidebar.tsx
import { Flex, Text, Button, Separator, Badge } from '@radix-ui/themes';
import {
  DashboardIcon,
  ReaderIcon,
  BarChartIcon,
  GearIcon,
  BellIcon,
} from '@radix-ui/react-icons';
import { cn } from '../../utils/cn';

interface SidebarProps {
  currentPath: string;
  notifications?: number;
}

export function Sidebar({ currentPath, notifications = 0 }: SidebarProps) {
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: DashboardIcon,
    },
    {
      name: 'Subscriptions',
      href: '/subscriptions',
      icon: ReaderIcon,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChartIcon,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: GearIcon,
    },
  ];

  return (
    <Flex direction="column" className="w-64 bg-gray-50 border-r p-4" gap="6">
      <Flex direction="column" gap="1">
        <Text size="6" weight="bold" className="text-blue-600">
          SubPilot
        </Text>
        <Text size="2" color="gray">
          Subscription Manager
        </Text>
      </Flex>

      <Separator />

      <Flex direction="column" gap="2">
        {navigation.map((item) => {
          const isActive = currentPath === item.href;
          
          return (
            <Button
              key={item.name}
              variant={isActive ? 'solid' : 'ghost'}
              color={isActive ? 'blue' : 'gray'}
              size="3"
              className={cn(
                'justify-start',
                isActive && 'font-medium'
              )}
            >
              <item.icon />
              {item.name}
            </Button>
          );
        })}
      </Flex>

      <Separator />

      <Button variant="soft" color="orange" size="3" className="justify-start">
        <BellIcon />
        Notifications
        {notifications > 0 && (
          <Badge color="red" size="1">
            {notifications}
          </Badge>
        )}
      </Button>
    </Flex>
  );
}
```

## Accessibility Patterns

### Screen Reader Support

```typescript
// components/ui/AccessibleAmountDisplay.tsx
import { Text, VisuallyHidden } from '@radix-ui/themes';

interface AccessibleAmountDisplayProps {
  amount: number;
  currency?: string;
  label?: string;
}

export function AccessibleAmountDisplay({
  amount,
  currency = 'USD',
  label,
}: AccessibleAmountDisplayProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);

  const spokenAmount = `${amount} ${currency}`;

  return (
    <Text>
      <VisuallyHidden>
        {label ? `${label}: ` : ''}
        {spokenAmount}
      </VisuallyHidden>
      <span aria-hidden="true">
        {formattedAmount}
      </span>
    </Text>
  );
}
```

### Keyboard Navigation

```typescript
// components/ui/SubscriptionCard.tsx
import { Card, Flex, Text, Button } from '@radix-ui/themes';
import { useRef } from 'react';

export function SubscriptionCard({ subscription }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Navigate to subscription details
        break;
      case 'Delete':
        event.preventDefault();
        // Open delete confirmation
        break;
    }
  };

  return (
    <Card
      ref={cardRef}
      tabIndex={0}
      role="button"
      aria-label={`Subscription: ${subscription.name}, ${subscription.amount} per ${subscription.frequency}`}
      onKeyDown={handleKeyDown}
      className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
    >
      <Flex direction="column" gap="3" className="p-4">
        <Text size="4" weight="bold">
          {subscription.name}
        </Text>
        <AmountDisplay
          amount={subscription.amount}
          currency={subscription.currency}
        />
        <Flex gap="2">
          <Button size="1" variant="soft">
            Edit
          </Button>
          <Button size="1" variant="outline" color="red">
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
```

## Responsive Design Patterns

### Mobile-First Layout

```typescript
// components/layout/ResponsiveGrid.tsx
import { Grid, Box } from '@radix-ui/themes';
import { cn } from '../../utils/cn';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveGrid({ children, className }: ResponsiveGridProps) {
  return (
    <Grid
      columns={{
        initial: '1',     // Mobile: single column
        sm: '2',          // Small screens: 2 columns
        md: '3',          // Medium screens: 3 columns
        lg: '4',          // Large screens: 4 columns
      }}
      gap="4"
      className={cn('w-full', className)}
    >
      {children}
    </Grid>
  );
}

// Usage example
export function SubscriptionGrid({ subscriptions }) {
  return (
    <ResponsiveGrid>
      {subscriptions.map((subscription) => (
        <SubscriptionCard key={subscription.id} subscription={subscription} />
      ))}
    </ResponsiveGrid>
  );
}
```

### Adaptive Components

```typescript
// components/ui/AdaptiveDialog.tsx
import { Dialog, Button, Drawer } from '@radix-ui/themes';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface AdaptiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}

export function AdaptiveDialog({
  open,
  onOpenChange,
  title,
  children,
  trigger,
}: AdaptiveDialogProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    // Use drawer on mobile for better UX
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
        <Drawer.Portal>
          <Drawer.Overlay className="DrawerOverlay" />
          <Drawer.Content className="DrawerContent">
            <Drawer.Title>{title}</Drawer.Title>
            {children}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Use dialog on desktop
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title>{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## Advanced Patterns

### Compound Components

```typescript
// components/ui/DataTable.tsx
import { Table, Flex, Text, Button, Checkbox } from '@radix-ui/themes';
import { ChevronUpIcon, ChevronDownIcon } from '@radix-ui/react-icons';

interface DataTableProps {
  children: React.ReactNode;
  selectable?: boolean;
}

interface TableColumn {
  children: React.ReactNode;
  sortable?: boolean;
  onSort?: (direction: 'asc' | 'desc') => void;
  sortDirection?: 'asc' | 'desc' | null;
}

// Compound component pattern
export function DataTable({ children, selectable }: DataTableProps) {
  return (
    <Table.Root variant="surface">
      {children}
    </Table.Root>
  );
}

DataTable.Header = function DataTableHeader({ children }) {
  return <Table.Header>{children}</Table.Header>;
};

DataTable.Column = function DataTableColumn({
  children,
  sortable,
  onSort,
  sortDirection,
}: TableColumn) {
  const handleSort = () => {
    if (!onSort) return;
    
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(newDirection);
  };

  return (
    <Table.ColumnHeaderCell>
      <Flex align="center" gap="2">
        {children}
        {sortable && (
          <Button variant="ghost" size="1" onClick={handleSort}>
            {sortDirection === 'asc' ? (
              <ChevronUpIcon />
            ) : sortDirection === 'desc' ? (
              <ChevronDownIcon />
            ) : (
              <ChevronUpIcon className="opacity-30" />
            )}
          </Button>
        )}
      </Flex>
    </Table.ColumnHeaderCell>
  );
};

DataTable.Body = function DataTableBody({ children }) {
  return <Table.Body>{children}</Table.Body>;
};

DataTable.Row = function DataTableRow({ children, selectable, selected, onSelect }) {
  return (
    <Table.Row>
      {selectable && (
        <Table.Cell>
          <Checkbox checked={selected} onCheckedChange={onSelect} />
        </Table.Cell>
      )}
      {children}
    </Table.Row>
  );
};

DataTable.Cell = function DataTableCell({ children }) {
  return <Table.Cell>{children}</Table.Cell>;
};

// Usage
export function SubscriptionTable({ subscriptions }) {
  return (
    <DataTable selectable>
      <DataTable.Header>
        <DataTable.Row>
          <DataTable.Column sortable>Name</DataTable.Column>
          <DataTable.Column sortable>Amount</DataTable.Column>
          <DataTable.Column sortable>Next Payment</DataTable.Column>
          <DataTable.Column>Status</DataTable.Column>
          <DataTable.Column>Actions</DataTable.Column>
        </DataTable.Row>
      </DataTable.Header>
      <DataTable.Body>
        {subscriptions.map((subscription) => (
          <DataTable.Row key={subscription.id}>
            <DataTable.Cell>{subscription.name}</DataTable.Cell>
            <DataTable.Cell>
              <AmountDisplay amount={subscription.amount} />
            </DataTable.Cell>
            <DataTable.Cell>{formatDate(subscription.nextPayment)}</DataTable.Cell>
            <DataTable.Cell>
              <SubscriptionStatusBadge status={subscription.status} />
            </DataTable.Cell>
            <DataTable.Cell>
              <Button variant="soft" size="1">Edit</Button>
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable.Body>
    </DataTable>
  );
}
```

This comprehensive UI guide provides the foundation for building a consistent, accessible, and beautiful interface for SubPilot using Radix UI components and patterns.
