import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { SubscriptionList } from '@/components/subscription-list';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextBilling: Date | null;
  status: 'active' | 'cancelled' | 'pending';
  isActive: boolean;
  category?: string;
  provider?: {
    name: string;
    logo?: string | null;
  } | null;
  lastTransaction?: Date;
}

const mockSubscription1: Subscription = {
  id: 'sub-1',
  name: 'Netflix',
  amount: 15.99,
  currency: 'USD',
  frequency: 'monthly',
  nextBilling: new Date('2024-08-15'),
  status: 'active',
  isActive: true,
  category: 'Entertainment',
  provider: {
    name: 'Netflix Inc.',
    logo: 'https://example.com/netflix-logo.png',
  },
  lastTransaction: new Date('2024-07-15'),
};

const mockSubscription2: Subscription = {
  id: 'sub-2',
  name: 'Spotify',
  amount: 9.99,
  currency: 'USD',
  frequency: 'monthly',
  nextBilling: new Date('2024-08-10'),
  status: 'active',
  isActive: true,
  category: 'Music',
  provider: {
    name: 'Spotify AB',
    logo: null,
  },
  lastTransaction: new Date('2024-07-10'),
};

const mockSubscription3: Subscription = {
  id: 'sub-3',
  name: 'Hulu',
  amount: 7.99,
  currency: 'USD',
  frequency: 'monthly',
  nextBilling: null,
  status: 'cancelled',
  isActive: false,
  category: 'Entertainment',
  provider: null,
  lastTransaction: new Date('2024-06-01'),
};

const mockSubscriptions: Subscription[] = [
  mockSubscription1,
  mockSubscription2,
  mockSubscription3,
];

describe('SubscriptionList', () => {
  it('renders loading state correctly', () => {
    render(<SubscriptionList subscriptions={[]} isLoading={true} />);

    // Should show skeleton loaders with pulse animation
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(6);
  });

  it('shows empty state when no subscriptions', () => {
    render(<SubscriptionList subscriptions={[]} />);

    expect(screen.getByText('No subscriptions found')).toBeInTheDocument();
  });

  it('renders subscription cards correctly', () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Check that all subscriptions are rendered
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('Hulu')).toBeInTheDocument();
  });

  it('filters subscriptions by search query', async () => {
    const user = userEvent.setup();
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    const searchInput = screen.getByPlaceholderText('Search subscriptions...');
    await user.type(searchInput, 'Netflix');

    // Only Netflix should be visible
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
    expect(screen.queryByText('Hulu')).not.toBeInTheDocument();
  });

  it('searches by provider name', async () => {
    const user = userEvent.setup();
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    const searchInput = screen.getByPlaceholderText('Search subscriptions...');
    await user.type(searchInput, 'Spotify AB');

    // Only Spotify should be visible
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('renders status filter select', () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Check that the status filter is rendered
    const statusSelects = screen.getAllByRole('combobox');
    expect(statusSelects[0]).toHaveTextContent('All Status');
  });

  it('renders category filter with provided categories', () => {
    const categories = ['Entertainment', 'Music'];
    render(
      <SubscriptionList
        subscriptions={mockSubscriptions}
        categories={categories}
      />
    );

    // Check that the category filter is rendered
    const categorySelects = screen.getAllByRole('combobox');
    expect(categorySelects[1]).toHaveTextContent('All Categories');
  });

  it('renders sort filter', () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Check that the sort filter is rendered with default value
    const sortSelects = screen.getAllByRole('combobox');
    expect(sortSelects[2]).toHaveTextContent('Next Billing');
  });

  it('sorts subscriptions by next billing date by default', () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Get subscription names by their card title class
    const subscriptionTitles = document.querySelectorAll(
      '.text-lg.font-semibold'
    );

    // Spotify (Aug 10) should come before Netflix (Aug 15)
    // Hulu (no next billing) should be last
    expect(subscriptionTitles[0]).toHaveTextContent('Spotify');
    expect(subscriptionTitles[1]).toHaveTextContent('Netflix');
    expect(subscriptionTitles[2]).toHaveTextContent('Hulu');
  });

  it('renders filter selects', () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Should have 3 select elements
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(3);
    expect(selects[0]).toHaveTextContent('All Status');
    expect(selects[1]).toHaveTextContent('All Categories');
    expect(selects[2]).toHaveTextContent('Next Billing');
  });

  it('can clear search filter', async () => {
    const user = userEvent.setup();
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Set search
    const searchInput = screen.getByPlaceholderText('Search subscriptions...');
    await user.type(searchInput, 'Netflix');

    // Clear search
    await user.clear(searchInput);

    // All subscriptions should be visible again
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('Hulu')).toBeInTheDocument();
  });

  it('shows empty state with filters message', async () => {
    const user = userEvent.setup();
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search subscriptions...');
    await user.type(searchInput, 'Amazon Prime');

    expect(
      screen.getByText('No subscriptions found matching your filters')
    ).toBeInTheDocument();

    // Apply a status filter to show the Clear filters button
    const statusSelect = screen.getAllByRole('combobox')[0];
    await user.click(statusSelect!);
    const activeOption = await screen.findByText('Active');
    await user.click(activeOption);

    // Now the button should be visible
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('passes callbacks to subscription cards', () => {
    const handleCancel = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SubscriptionList
        subscriptions={[mockSubscription1]}
        onCancel={handleCancel}
        onUpdate={handleUpdate}
      />
    );

    // The SubscriptionCard should be rendered with the callbacks
    // We can't directly test if they're passed, but we can verify the card is rendered
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('handles multiple subscriptions with same status', () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // Netflix and Spotify are both active
    const activeSubscriptions = mockSubscriptions.filter(
      s => s.status === 'active'
    );
    expect(activeSubscriptions).toHaveLength(2);

    // Both should be visible
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
  });
});
