import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { EditSubscriptionModal } from '@/components/edit-subscription-modal';
import { AddSubscriptionModal } from '@/components/add-subscription-modal';
import { CancellationAssistant } from '@/components/cancellation-assistant';
import { ArchiveSubscriptionModal } from '@/components/archive-subscription-modal';

// Mock tRPC
vi.mock('@/trpc/react', () => ({
  api: {
    subscriptions: {
      update: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      create: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      markCancelled: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      subscriptions: {
        getAll: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
        getStats: { invalidate: vi.fn() },
        getCategories: { invalidate: vi.fn() },
      },
    })),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSubscription = {
  id: 'test-id',
  name: 'Netflix Premium',
  category: 'Streaming',
  notes: 'Family plan',
  isActive: true,
  amount: 15.99,
  currency: 'USD',
  frequency: 'monthly',
  provider: {
    name: 'Netflix',
    website: 'https://netflix.com',
  },
};

describe('Subscription Management Components', () => {
  describe('EditSubscriptionModal', () => {
    const editProps = {
      subscription: mockSubscription,
      open: true,
      onOpenChange: vi.fn(),
      onSuccess: vi.fn(),
    };

    it('renders edit subscription modal', () => {
      render(<EditSubscriptionModal {...editProps} />);

      expect(screen.getByText('Edit Subscription')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Netflix Premium')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Family plan')).toBeInTheDocument();
    });

    it('has save and cancel buttons', () => {
      render(<EditSubscriptionModal {...editProps} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('AddSubscriptionModal', () => {
    const addProps = {
      open: true,
      onOpenChange: vi.fn(),
      onSuccess: vi.fn(),
    };

    it('renders add subscription modal', () => {
      render(<AddSubscriptionModal {...addProps} />);

      expect(screen.getByText('Add Manual Subscription')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Netflix Premium')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('19.99')).toBeInTheDocument();
    });

    it('has required form fields', () => {
      render(<AddSubscriptionModal {...addProps} />);

      expect(screen.getByText('Subscription Name *')).toBeInTheDocument();
      expect(screen.getByText('Amount *')).toBeInTheDocument();
      expect(screen.getByText('Currency *')).toBeInTheDocument();
      expect(screen.getByText('Frequency *')).toBeInTheDocument();
    });

    it('has add and cancel buttons', () => {
      render(<AddSubscriptionModal {...addProps} />);

      expect(screen.getByText('Add Subscription')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('CancellationAssistant', () => {
    const cancellationProps = {
      subscription: mockSubscription,
      open: true,
      onOpenChange: vi.fn(),
      onMarkCancelled: vi.fn(),
    };

    it('renders cancellation assistant', () => {
      render(<CancellationAssistant {...cancellationProps} />);

      expect(screen.getByText('Cancel Netflix Premium')).toBeInTheDocument();
      expect(
        screen.getByText('Step-by-step guide to cancel your subscription')
      ).toBeInTheDocument();
    });

    it('shows subscription details', () => {
      render(<CancellationAssistant {...cancellationProps} />);

      expect(screen.getByText('Subscription Details')).toBeInTheDocument();
      expect(screen.getByText('Netflix Premium')).toBeInTheDocument();
      expect(screen.getByText('$15.99 / month')).toBeInTheDocument();
    });

    it('shows cancellation methods', () => {
      render(<CancellationAssistant {...cancellationProps} />);

      expect(screen.getByText('Cancellation Methods')).toBeInTheDocument();
      expect(screen.getByText('Cancel Online')).toBeInTheDocument();
    });

    it('has action buttons', () => {
      render(<CancellationAssistant {...cancellationProps} />);

      expect(screen.getByText('Close Guide')).toBeInTheDocument();
      expect(screen.getByText('Mark as Cancelled')).toBeInTheDocument();
    });
  });

  describe('ArchiveSubscriptionModal', () => {
    const archiveProps = {
      subscription: mockSubscription,
      open: true,
      onOpenChange: vi.fn(),
      onSuccess: vi.fn(),
    };

    it('renders archive subscription modal', () => {
      render(<ArchiveSubscriptionModal {...archiveProps} />);

      expect(
        screen.getByText('Mark Subscription as Cancelled')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Record the cancellation details for Netflix Premium')
      ).toBeInTheDocument();
    });

    it('shows subscription summary', () => {
      render(<ArchiveSubscriptionModal {...archiveProps} />);

      expect(screen.getByText('Netflix Premium')).toBeInTheDocument();
      expect(screen.getByText('$15.99 / month')).toBeInTheDocument();
    });

    it('has cancellation form fields', () => {
      render(<ArchiveSubscriptionModal {...archiveProps} />);

      expect(screen.getByText('Cancellation Date *')).toBeInTheDocument();
      expect(screen.getByText('Cancellation Reason')).toBeInTheDocument();
      expect(screen.getByText('Refund Amount')).toBeInTheDocument();
    });

    it('has action buttons', () => {
      render(<ArchiveSubscriptionModal {...archiveProps} />);

      expect(screen.getByText('Mark as Cancelled')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('can close modals with cancel buttons', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <EditSubscriptionModal
          subscription={mockSubscription}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows provider-specific cancellation instructions', () => {
      render(
        <CancellationAssistant
          subscription={mockSubscription}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // Netflix-specific instructions
      expect(
        screen.getByText('Sign in to your Netflix account')
      ).toBeInTheDocument();
      expect(screen.getByText('Go to Account settings')).toBeInTheDocument();
      expect(screen.getByText('Click "Cancel Membership"')).toBeInTheDocument();
    });

    it('handles unknown providers with default instructions', () => {
      const unknownProviderSubscription = {
        ...mockSubscription,
        provider: {
          name: 'Unknown Service',
        },
      };

      render(
        <CancellationAssistant
          subscription={unknownProviderSubscription}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText('Check Provider Website')).toBeInTheDocument();
      expect(screen.getByText('Call Customer Service')).toBeInTheDocument();
      expect(screen.getByText('Email Support')).toBeInTheDocument();
    });
  });
});
