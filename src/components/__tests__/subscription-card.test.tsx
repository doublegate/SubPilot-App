import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { SubscriptionCard } from '@/components/subscription-card';
import { mockSubscription } from '@/test/utils';

// Mock tRPC api
const mockInitiateMutation = vi.hoisted(() =>
  vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
  }))
);

vi.mock('@/trpc/react', () => ({
  api: {
    cancellation: {
      canCancel: {
        useQuery: vi.fn(() => ({
          data: { canCancel: true, reason: null },
          isLoading: false,
        })),
      },
      initiate: {
        useMutation: mockInitiateMutation,
      },
    },
  },
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

describe('SubscriptionCard', () => {
  it('renders subscription information correctly', () => {
    render(<SubscriptionCard subscription={mockSubscription} />);

    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Streaming')).toBeInTheDocument();
  });

  it('shows upcoming billing warning when renewal is within 7 days', () => {
    const upcomingSubscription = {
      ...mockSubscription,
      nextBilling: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    };

    render(<SubscriptionCard subscription={upcomingSubscription} />);

    expect(screen.getByText(/Next billing:/)).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();
  });

  it('shows cancelled state correctly', () => {
    const cancelledSubscription = {
      ...mockSubscription,
      status: 'cancelled' as const,
    };

    render(<SubscriptionCard subscription={cancelledSubscription} />);

    expect(screen.getByText('cancelled')).toBeInTheDocument();
    expect(
      screen.getByText('This subscription has been cancelled')
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel menu item is clicked', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    // Mock the mutation to call onSuccess callback
    let mockOnSuccess: ((result: any) => void) | undefined;

    const mockUseMutation = vi.fn(options => {
      mockOnSuccess = options?.onSuccess;
      return {
        mutate: vi.fn(),
        mutateAsync: vi.fn(async () => {
          const result = { id: 'cancellation-1', status: 'pending' };
          // Trigger the onSuccess callback
          mockOnSuccess?.(result);
          return result;
        }),
        isLoading: false,
      };
    });

    mockInitiateMutation.mockImplementation(mockUseMutation);

    render(
      <SubscriptionCard
        subscription={mockSubscription}
        onCancel={handleCancel}
      />
    );

    // Open dropdown menu
    const menuButtons = screen.getAllByRole('button');
    const menuButton = menuButtons.find(btn =>
      btn.className.includes('h-8 w-8')
    );
    expect(menuButton).toBeDefined();
    await user.click(menuButton!);

    // Click cancel option to open modal
    const cancelButton = await screen.findByText('Cancel Subscription');
    await user.click(cancelButton);

    // The modal should now be open - find and click the confirm button
    const confirmButton = await screen.findByText('Start Cancellation');
    await user.click(confirmButton);

    expect(handleCancel).toHaveBeenCalledWith(mockSubscription.id);
  });

  it('calls onUpdate when edit menu item is clicked', async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn();
    render(
      <SubscriptionCard
        subscription={mockSubscription}
        onUpdate={handleUpdate}
      />
    );

    // Open dropdown menu - find button by class since it has no aria-label
    const menuButtons = screen.getAllByRole('button');
    const menuButton = menuButtons.find(btn =>
      btn.className.includes('h-8 w-8')
    );
    expect(menuButton).toBeDefined();
    await user.click(menuButton!);

    // Wait for dropdown content to appear and click edit option
    const editButton = await screen.findByText('Edit Subscription');
    await user.click(editButton);

    expect(handleUpdate).toHaveBeenCalledWith(mockSubscription.id);
  });

  it('shows provider logo when available', () => {
    render(<SubscriptionCard subscription={mockSubscription} />);

    const logo = screen.getByAltText('Netflix Inc.');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', mockSubscription.provider.logo);
  });

  it('shows fallback initial when no logo is available', () => {
    const subscriptionWithoutLogo = {
      ...mockSubscription,
      provider: {
        name: 'Netflix Inc.',
        logo: null,
      },
    };

    render(<SubscriptionCard subscription={subscriptionWithoutLogo} />);

    expect(screen.getByText('N')).toBeInTheDocument();
  });
});
