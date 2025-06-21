import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { SubscriptionList } from '@/components/subscription-list';

// Mock tRPC
const mockGetAll = vi.fn();
const mockCancel = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/trpc/react', () => ({
  api: {
    subscriptions: {
      getAll: {
        useQuery: () => ({
          data: mockGetAll(),
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      cancel: {
        useMutation: () => ({
          mutate: mockCancel,
          isLoading: false,
        }),
      },
      update: {
        useMutation: () => ({
          mutate: mockUpdate,
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('SubscriptionList', () => {
  const mockSubscriptions = [
    {
      id: 'sub-1',
      name: 'Netflix',
      amount: 15.99,
      currency: 'USD',
      frequency: 'monthly',
      category: 'Entertainment',
      nextBilling: new Date('2024-08-15'),
      lastBilling: new Date('2024-07-15'),
      isActive: true,
      provider: {
        name: 'Netflix',
        logo: 'https://example.com/netflix-logo.png',
      },
      transactions: [
        {
          id: 'txn-1',
          amount: -15.99,
          date: new Date('2024-07-15'),
        },
      ],
    },
    {
      id: 'sub-2',
      name: 'Spotify',
      amount: 9.99,
      currency: 'USD',
      frequency: 'monthly',
      category: 'Music',
      nextBilling: new Date('2024-08-20'),
      lastBilling: new Date('2024-07-20'),
      isActive: true,
      provider: {
        name: 'Spotify',
        logo: 'https://example.com/spotify-logo.png',
      },
      transactions: [],
    },
    {
      id: 'sub-3',
      name: 'Adobe Creative Suite',
      amount: 52.99,
      currency: 'USD',
      frequency: 'monthly',
      category: 'Software',
      nextBilling: new Date('2024-08-10'),
      lastBilling: new Date('2024-07-10'),
      isActive: false,
      provider: {
        name: 'Adobe',
        logo: null,
      },
      transactions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockReturnValue(mockSubscriptions);
  });

  it('renders subscription list correctly', () => {
    render(<SubscriptionList />);

    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('Adobe Creative Suite')).toBeInTheDocument();

    expect(screen.getByText('$15.99/month')).toBeInTheDocument();
    expect(screen.getByText('$9.99/month')).toBeInTheDocument();
    expect(screen.getByText('$52.99/month')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    const mockApi = require('@/trpc/react').api;
    mockApi.subscriptions.getAll.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<SubscriptionList />);

    expect(screen.getAllByTestId('subscription-skeleton')).toHaveLength(3);
  });

  it('shows empty state when no subscriptions', () => {
    mockGetAll.mockReturnValue([]);

    render(<SubscriptionList />);

    expect(screen.getByText(/no subscriptions found/i)).toBeInTheDocument();
    expect(screen.getByText(/start by connecting/i)).toBeInTheDocument();
  });

  it('filters subscriptions by search term', async () => {
    render(<SubscriptionList />);

    const searchInput = screen.getByPlaceholderText(/search subscriptions/i);
    fireEvent.change(searchInput, { target: { value: 'Netflix' } });

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
      expect(screen.queryByText('Adobe Creative Suite')).not.toBeInTheDocument();
    });
  });

  it('filters subscriptions by category', async () => {
    render(<SubscriptionList />);

    const categoryFilter = screen.getByRole('combobox', { name: /category/i });
    fireEvent.click(categoryFilter);

    const entertainmentOption = screen.getByText('Entertainment');
    fireEvent.click(entertainmentOption);

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
      expect(screen.queryByText('Adobe Creative Suite')).not.toBeInTheDocument();
    });
  });

  it('filters subscriptions by status', async () => {
    render(<SubscriptionList />);

    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusFilter);

    const canceledOption = screen.getByText('Canceled');
    fireEvent.click(canceledOption);

    await waitFor(() => {
      expect(screen.getByText('Adobe Creative Suite')).toBeInTheDocument();
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
    });
  });

  it('sorts subscriptions by different criteria', async () => {
    render(<SubscriptionList />);

    const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
    fireEvent.click(sortSelect);

    const amountOption = screen.getByText('Amount (High to Low)');
    fireEvent.click(amountOption);

    await waitFor(() => {
      const subscriptionCards = screen.getAllByTestId('subscription-card');
      expect(subscriptionCards[0]).toHaveTextContent('Adobe Creative Suite');
      expect(subscriptionCards[1]).toHaveTextContent('Netflix');
      expect(subscriptionCards[2]).toHaveTextContent('Spotify');
    });
  });

  it('displays subscription status badges correctly', () => {
    render(<SubscriptionList />);

    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByText('Canceled')).toBeInTheDocument();
  });

  it('shows upcoming billing dates', () => {
    render(<SubscriptionList />);

    expect(screen.getByText(/next billing/i)).toBeInTheDocument();
    expect(screen.getByText('Aug 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Aug 20, 2024')).toBeInTheDocument();
  });

  it('handles subscription cancellation', async () => {
    const mockToast = require('sonner').toast;

    mockCancel.mockImplementation((params) => {
      params.onSuccess?.();
    });

    render(<SubscriptionList />);

    const netflixCard = screen.getByTestId('subscription-card-sub-1');
    const cancelButton = netflixCard.querySelector('[data-testid="cancel-button"]');
    
    if (cancelButton) {
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalledWith({
          id: 'sub-1',
          reason: expect.any(String),
        });
        expect(mockToast.success).toHaveBeenCalledWith('Subscription canceled successfully');
      });
    }
  });

  it('handles subscription editing', async () => {
    const mockRouter = require('next/navigation').useRouter();

    render(<SubscriptionList />);

    const netflixCard = screen.getByTestId('subscription-card-sub-1');
    const editButton = netflixCard.querySelector('[data-testid="edit-button"]');
    
    if (editButton) {
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(mockRouter().push).toHaveBeenCalledWith('/subscriptions/sub-1/edit');
      });
    }
  });

  it('displays provider logos when available', () => {
    render(<SubscriptionList />);

    const netflixLogo = screen.getByAltText('Netflix logo');
    const spotifyLogo = screen.getByAltText('Spotify logo');

    expect(netflixLogo).toBeInTheDocument();
    expect(spotifyLogo).toBeInTheDocument();
    expect(netflixLogo).toHaveAttribute('src', 'https://example.com/netflix-logo.png');
  });

  it('shows fallback when provider logo is not available', () => {
    render(<SubscriptionList />);

    const adobeCard = screen.getByTestId('subscription-card-sub-3');
    const fallbackIcon = adobeCard.querySelector('[data-testid="provider-fallback"]');

    expect(fallbackIcon).toBeInTheDocument();
  });

  it('calculates and displays total monthly cost', () => {
    render(<SubscriptionList />);

    // Only active subscriptions: Netflix ($15.99) + Spotify ($9.99) = $25.98
    expect(screen.getByText('$25.98')).toBeInTheDocument();
    expect(screen.getByText(/total monthly cost/i)).toBeInTheDocument();
  });

  it('handles different frequency types correctly', () => {
    const subscriptionsWithDifferentFrequencies = [
      {
        ...mockSubscriptions[0],
        frequency: 'yearly',
        amount: 149.99,
      },
      {
        ...mockSubscriptions[1],
        frequency: 'weekly',
        amount: 2.99,
      },
    ];

    mockGetAll.mockReturnValue(subscriptionsWithDifferentFrequencies);

    render(<SubscriptionList />);

    expect(screen.getByText('$149.99/year')).toBeInTheDocument();
    expect(screen.getByText('$2.99/week')).toBeInTheDocument();
  });

  it('shows renewal warnings for upcoming bills', () => {
    const upcomingSubscription = {
      ...mockSubscriptions[0],
      nextBilling: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    };

    mockGetAll.mockReturnValue([upcomingSubscription]);

    render(<SubscriptionList />);

    expect(screen.getByTestId('renewal-warning')).toBeInTheDocument();
    expect(screen.getByText(/renews in 2 days/i)).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<SubscriptionList />);

    const listContainer = screen.getByTestId('subscription-list');
    expect(listContainer).toHaveClass('grid', 'gap-4');

    const searchContainer = screen.getByTestId('search-filters');
    expect(searchContainer).toHaveClass('flex', 'gap-4', 'mb-6');
  });

  it('handles empty search results', async () => {
    render(<SubscriptionList />);

    const searchInput = screen.getByPlaceholderText(/search subscriptions/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentService' } });

    await waitFor(() => {
      expect(screen.getByText(/no subscriptions match your search/i)).toBeInTheDocument();
    });
  });

  it('maintains search and filter state correctly', async () => {
    render(<SubscriptionList />);

    const searchInput = screen.getByPlaceholderText(/search subscriptions/i);
    fireEvent.change(searchInput, { target: { value: 'Net' } });

    const categoryFilter = screen.getByRole('combobox', { name: /category/i });
    fireEvent.click(categoryFilter);
    fireEvent.click(screen.getByText('Entertainment'));

    await waitFor(() => {
      expect(searchInput).toHaveValue('Net');
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
    });
  });
});