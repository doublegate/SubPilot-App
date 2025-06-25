import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { TransactionList } from '@/components/transaction-list';

interface Transaction {
  id: string;
  date: Date;
  name: string;
  merchantName?: string | null;
  amount: number;
  currency: string;
  category?: string | null;
  pending: boolean;
  isRecurring?: boolean;
  account: {
    name: string;
    institution: string;
  };
  subscription?: {
    id: string;
    name: string;
  } | null;
}

const mockTransaction1: Transaction = {
  id: 'txn-1',
  date: new Date('2024-07-15'),
  name: 'Netflix Monthly Subscription',
  merchantName: 'Netflix',
  amount: -15.99,
  currency: 'USD',
  category: 'Entertainment',
  pending: false,
  isRecurring: true,
  account: {
    name: 'Checking Account',
    institution: 'Chase Bank',
  },
  subscription: {
    id: 'sub-1',
    name: 'Netflix',
  },
};

const mockTransaction2: Transaction = {
  id: 'txn-2',
  date: new Date('2024-07-14'),
  name: 'Starbucks',
  merchantName: 'Starbucks',
  amount: -5.75,
  currency: 'USD',
  category: 'Food & Drink',
  pending: true,
  isRecurring: false,
  account: {
    name: 'Credit Card',
    institution: 'Capital One',
  },
  subscription: null,
};

const mockTransaction3: Transaction = {
  id: 'txn-3',
  date: new Date('2024-07-13'),
  name: 'Spotify Premium',
  merchantName: 'Spotify',
  amount: -9.99,
  currency: 'USD',
  category: 'Entertainment',
  pending: false,
  isRecurring: true,
  account: {
    name: 'Checking Account',
    institution: 'Chase Bank',
  },
  subscription: null,  // Changed to null to show "Recurring" badge
};

const mockTransactions: Transaction[] = [
  mockTransaction1,
  mockTransaction2,
  mockTransaction3,
];

describe('TransactionList', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<TransactionList transactions={[]} isLoading={true} />);

    // Should show skeleton items with specific classes
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no transactions', () => {
    render(<TransactionList transactions={[]} />);

    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('renders transaction list correctly', () => {
    const { container } = render(
      <TransactionList transactions={mockTransactions} />
    );

    // Check table headers
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();

    // Check if transactions are rendered - look for table cells
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(3);

    // Check first transaction content
    expect(
      screen.getByText('Netflix Monthly Subscription')
    ).toBeInTheDocument();
    expect(screen.getByText('Netflix', { selector: 'p' })).toBeInTheDocument();
    // Entertainment appears in multiple transactions, so check for at least one
    expect(screen.getAllByText('Entertainment').length).toBeGreaterThanOrEqual(
      1
    );
    // Checking Account appears multiple times, check for at least one
    expect(
      screen.getAllByText('Checking Account').length
    ).toBeGreaterThanOrEqual(1);
    // Chase Bank appears multiple times too
    expect(screen.getAllByText('Chase Bank').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('-$15.99')).toBeInTheDocument();

    // Check linked subscription
    expect(
      screen.getByText('Netflix', { selector: 'span' })
    ).toBeInTheDocument();

    // Check pending transaction - Starbucks appears as both name and merchantName
    const starbucksElements = screen.getAllByText('Starbucks');
    expect(starbucksElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Check recurring transaction without subscription
    expect(screen.getByText('Recurring')).toBeInTheDocument();
  });

  it('formats positive amounts correctly', () => {
    const positiveTransaction: Transaction = {
      ...mockTransaction1,
      id: 'txn-4',
      amount: 100.5,
      name: 'Refund',
    };

    render(<TransactionList transactions={[positiveTransaction]} />);

    expect(screen.getByText('+$100.50')).toBeInTheDocument();
    expect(screen.getByText('+$100.50')).toHaveClass('text-green-600');
  });

  it('shows merchant name when available', () => {
    render(<TransactionList transactions={mockTransactions} />);

    const merchantNames = screen.getAllByText('Netflix');
    expect(merchantNames.length).toBeGreaterThan(0);
  });

  it('shows dash for missing category', () => {
    const transactionNoCategory: Transaction = {
      ...mockTransaction1,
      id: 'txn-5',
      category: null,
    };

    render(<TransactionList transactions={[transactionNoCategory]} />);

    // Count the dashes - one for category, possibly others
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('calls onViewDetails when menu item clicked', async () => {
    const user = userEvent.setup();
    const handleViewDetails = vi.fn();

    render(
      <TransactionList
        transactions={mockTransactions}
        onViewDetails={handleViewDetails}
      />
    );

    // Click the first dropdown menu
    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    await user.click(menuButtons[0]!);

    // Click view details
    const viewDetailsButton = await screen.findByText('View Details');
    await user.click(viewDetailsButton);

    expect(handleViewDetails).toHaveBeenCalledWith('txn-1');
  });

  it('shows link to subscription option for unlinked transactions', async () => {
    const user = userEvent.setup();
    const handleLink = vi.fn();

    render(
      <TransactionList
        transactions={mockTransactions}
        onLinkToSubscription={handleLink}
      />
    );

    // Click dropdown for the Spotify transaction (no subscription)
    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    await user.click(menuButtons[2]!);

    // Should show link option
    const linkButton = await screen.findByText('Link to Subscription');
    await user.click(linkButton);

    expect(handleLink).toHaveBeenCalledWith('txn-3');
  });

  it('shows unlink from subscription option for linked transactions', async () => {
    const user = userEvent.setup();
    const handleUnlink = vi.fn();

    render(
      <TransactionList
        transactions={mockTransactions}
        onUnlinkFromSubscription={handleUnlink}
      />
    );

    // Click dropdown for the Netflix transaction (has subscription)
    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    await user.click(menuButtons[0]!);

    // Should show unlink option
    const unlinkButton = await screen.findByText('Unlink from Subscription');
    await user.click(unlinkButton);

    expect(handleUnlink).toHaveBeenCalledWith('txn-1');
  });

  it('handles transactions with no merchant name', () => {
    const transactionNoMerchant: Transaction = {
      ...mockTransaction1,
      id: 'txn-6',
      merchantName: null,
    };

    render(<TransactionList transactions={[transactionNoMerchant]} />);

    // Should still show the transaction name
    expect(
      screen.getByText('Netflix Monthly Subscription')
    ).toBeInTheDocument();
  });

  it('displays linked subscription with icon', () => {
    render(<TransactionList transactions={[mockTransaction1]} />);

    // Check for the Netflix subscription link
    const subscriptionName = screen.getByText('Netflix', { selector: 'span' });
    expect(subscriptionName).toBeInTheDocument();

    // The LinkIcon should be rendered (it has class text-green-600)
    const linkIcon = subscriptionName.previousElementSibling;
    expect(linkIcon).toHaveClass('text-green-600');
  });

  it('handles multiple currencies correctly', () => {
    const eurTransaction: Transaction = {
      ...mockTransaction1,
      id: 'txn-7',
      currency: 'EUR',
      amount: -12.99,
    };

    render(<TransactionList transactions={[eurTransaction]} />);

    // Should format with EUR - the exact format depends on locale
    const amountElements = screen.getAllByText((content, element) => {
      return (
        element?.tagName === 'SPAN' &&
        element?.className?.includes('text-red-600') &&
        content.includes('12')
      );
    });
    expect(amountElements.length).toBeGreaterThan(0);
  });
});
