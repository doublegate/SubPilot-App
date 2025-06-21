import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { BankConnectionCard } from '@/components/bank-connection-card';

// Mock tRPC
const mockSyncTransactions = vi.fn();
const mockDeleteItem = vi.fn();

vi.mock('@/trpc/react', () => ({
  api: {
    plaid: {
      syncTransactions: {
        useMutation: () => ({
          mutate: mockSyncTransactions,
          isLoading: false,
        }),
      },
      deleteItem: {
        useMutation: () => ({
          mutate: mockDeleteItem,
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

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date) => '2 hours ago'),
  format: vi.fn((date) => 'Jul 15, 2024'),
}));

describe('BankConnectionCard', () => {
  const mockPlaidItem = {
    id: 'plaid-item-1',
    plaidItemId: 'item_123',
    institution: {
      id: 'ins_1',
      name: 'Chase Bank',
      logo: 'https://example.com/chase-logo.png',
    },
    isActive: true,
    lastSync: new Date('2024-07-15T10:00:00Z'),
    accounts: [
      {
        id: 'acc-1',
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        mask: '0000',
        currentBalance: 1500.50,
        availableBalance: 1450.25,
        isoCurrencyCode: 'USD',
      },
      {
        id: 'acc-2',
        name: 'Savings Account',
        type: 'depository',
        subtype: 'savings',
        mask: '1111',
        currentBalance: 5000.00,
        availableBalance: 5000.00,
        isoCurrencyCode: 'USD',
      },
    ],
  };

  const mockInactivePlaidItem = {
    ...mockPlaidItem,
    id: 'plaid-item-2',
    isActive: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bank connection card with institution info', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    expect(screen.getByText('Chase Bank')).toBeInTheDocument();
    expect(screen.getByText('2 accounts connected')).toBeInTheDocument();
    expect(screen.getByText('Last synced: 2 hours ago')).toBeInTheDocument();
  });

  it('displays institution logo when available', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const logo = screen.getByAltText('Chase Bank logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'https://example.com/chase-logo.png');
  });

  it('shows fallback icon when logo is not available', () => {
    const itemWithoutLogo = {
      ...mockPlaidItem,
      institution: {
        ...mockPlaidItem.institution,
        logo: null,
      },
    };

    render(<BankConnectionCard plaidItem={itemWithoutLogo} />);

    expect(screen.getByTestId('bank-fallback-icon')).toBeInTheDocument();
  });

  it('displays all connected accounts', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    expect(screen.getByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('••••0000')).toBeInTheDocument();
    expect(screen.getByText('$1,500.50')).toBeInTheDocument();

    expect(screen.getByText('Savings Account')).toBeInTheDocument();
    expect(screen.getByText('••••1111')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('shows active status badge for active connections', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows inactive status badge for inactive connections', () => {
    render(<BankConnectionCard plaidItem={mockInactivePlaidItem} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('handles sync transactions action', async () => {
    const mockToast = require('sonner').toast;

    mockSyncTransactions.mockImplementation((params) => {
      params.onSuccess?.({ transactionsAdded: 5, totalTransactions: 125 });
    });

    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const syncButton = screen.getByRole('button', { name: /sync transactions/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockSyncTransactions).toHaveBeenCalledWith({
        itemId: 'plaid-item-1',
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });
      expect(mockToast.success).toHaveBeenCalledWith('Added 5 new transactions (125 total)');
    });
  });

  it('shows loading state during sync', async () => {
    const mockApi = require('@/trpc/react').api;
    mockApi.plaid.syncTransactions.useMutation.mockReturnValue({
      mutate: mockSyncTransactions,
      isLoading: true,
    });

    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const syncButton = screen.getByRole('button', { name: /syncing/i });
    expect(syncButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles sync errors gracefully', async () => {
    const mockToast = require('sonner').toast;

    mockSyncTransactions.mockImplementation((params) => {
      params.onError?.(new Error('Sync failed'));
    });

    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const syncButton = screen.getByRole('button', { name: /sync transactions/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to sync transactions');
    });
  });

  it('handles disconnect action', async () => {
    const mockToast = require('sonner').toast;

    mockDeleteItem.mockImplementation((params) => {
      params.onSuccess?.();
    });

    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(mockDeleteItem).toHaveBeenCalledWith({
        itemId: 'plaid-item-1',
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });
      expect(mockToast.success).toHaveBeenCalledWith('Bank connection removed');
    });
  });

  it('shows confirmation dialog before disconnect', async () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    expect(screen.getByText(/are you sure you want to disconnect/i)).toBeInTheDocument();
    expect(screen.getByText(/this will remove all associated accounts/i)).toBeInTheDocument();
  });

  it('calculates total balance correctly', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    // $1,500.50 + $5,000.00 = $6,500.50
    expect(screen.getByText('Total Balance: $6,500.50')).toBeInTheDocument();
  });

  it('handles different account types correctly', () => {
    const itemWithCreditCard = {
      ...mockPlaidItem,
      accounts: [
        ...mockPlaidItem.accounts,
        {
          id: 'acc-3',
          name: 'Credit Card',
          type: 'credit',
          subtype: 'credit_card',
          mask: '2222',
          currentBalance: -500.00,
          availableBalance: 1500.00,
          isoCurrencyCode: 'USD',
        },
      ],
    };

    render(<BankConnectionCard plaidItem={itemWithCreditCard} />);

    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('••••2222')).toBeInTheDocument();
    expect(screen.getByText('-$500.00')).toBeInTheDocument();
  });

  it('shows account type badges', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const checkingBadge = screen.getByText('Checking');
    const savingsBadge = screen.getByText('Savings');

    expect(checkingBadge).toBeInTheDocument();
    expect(savingsBadge).toBeInTheDocument();
  });

  it('handles null balances gracefully', () => {
    const itemWithNullBalances = {
      ...mockPlaidItem,
      accounts: [
        {
          ...mockPlaidItem.accounts[0],
          currentBalance: null,
          availableBalance: null,
        },
      ],
    };

    render(<BankConnectionCard plaidItem={itemWithNullBalances} />);

    expect(screen.getByText('Balance unavailable')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<BankConnectionCard plaidItem={mockPlaidItem} />);

    const card = screen.getByTestId('bank-connection-card');
    expect(card).toHaveClass('border', 'rounded-lg', 'p-6');

    const institutionHeader = screen.getByTestId('institution-header');
    expect(institutionHeader).toHaveClass('flex', 'items-center', 'justify-between');
  });

  it('shows proper sync status messages', () => {
    const recentSync = {
      ...mockPlaidItem,
      lastSync: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    };

    render(<BankConnectionCard plaidItem={recentSync} />);

    expect(screen.getByText(/last synced: 2 hours ago/i)).toBeInTheDocument();
  });

  it('handles never synced state', () => {
    const neverSynced = {
      ...mockPlaidItem,
      lastSync: null,
    };

    render(<BankConnectionCard plaidItem={neverSynced} />);

    expect(screen.getByText('Never synced')).toBeInTheDocument();
  });

  it('shows warning for old sync data', () => {
    const oldSync = {
      ...mockPlaidItem,
      lastSync: new Date(Date.now() - 1000 * 60 * 60 * 48), // 48 hours ago
    };

    require('date-fns').formatDistanceToNow.mockReturnValue('2 days ago');

    render(<BankConnectionCard plaidItem={oldSync} />);

    expect(screen.getByTestId('sync-warning')).toBeInTheDocument();
    expect(screen.getByText(/data may be outdated/i)).toBeInTheDocument();
  });
});