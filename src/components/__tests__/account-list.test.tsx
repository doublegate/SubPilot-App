import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { AccountList } from '@/components/account-list';

const mockAccounts = [
  {
    id: 'acc-1',
    plaidAccountId: 'plaid-acc-1',
    name: 'Checking Account',
    type: 'depository',
    subtype: 'checking',
    balance: 2500.5,
    currency: 'USD',
    institution: {
      name: 'Chase Bank',
      logo: 'https://example.com/chase-logo.png',
    },
    isActive: true,
    lastSync: new Date('2024-07-20T10:00:00Z'),
  },
  {
    id: 'acc-2',
    plaidAccountId: 'plaid-acc-2',
    name: 'Visa Card',
    type: 'credit',
    subtype: 'credit card',
    balance: -1200.75,
    currency: 'USD',
    institution: {
      name: 'Capital One',
      logo: null,
    },
    isActive: true,
    lastSync: new Date('2024-07-20T09:30:00Z'),
  },
  {
    id: 'acc-3',
    plaidAccountId: 'plaid-acc-3',
    name: 'Investment Account',
    type: 'investment',
    subtype: 'brokerage',
    balance: 15000.0,
    currency: 'USD',
    institution: {
      name: 'Fidelity',
      logo: null,
    },
    isActive: false,
    lastSync: null,
  },
];

describe('AccountList', () => {
  it('shows empty state when no accounts', () => {
    render(<AccountList accounts={[]} />);

    expect(screen.getByText('No accounts connected')).toBeInTheDocument();
  });

  it('renders all accounts correctly', () => {
    render(<AccountList accounts={mockAccounts} />);

    // Check account names
    expect(screen.getByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('Visa Card')).toBeInTheDocument();
    expect(screen.getByText('Investment Account')).toBeInTheDocument();

    // Check institution names
    expect(screen.getByText('Chase Bank')).toBeInTheDocument();
    expect(screen.getByText('Capital One')).toBeInTheDocument();
    expect(screen.getByText('Fidelity')).toBeInTheDocument();
  });

  it('displays correct account type labels', () => {
    render(<AccountList accounts={mockAccounts} />);

    expect(screen.getByText('Bank Account - checking')).toBeInTheDocument();
    expect(screen.getByText('Credit Card - credit card')).toBeInTheDocument();
    expect(screen.getByText('Investment - brokerage')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<AccountList accounts={mockAccounts} />);

    expect(screen.getByText('$2,500.50')).toBeInTheDocument();
    expect(screen.getByText('-$1,200.75')).toBeInTheDocument();
    expect(screen.getByText('$15,000.00')).toBeInTheDocument();
  });

  it('shows inactive badge for inactive accounts', () => {
    render(<AccountList accounts={mockAccounts} />);

    const inactiveBadges = screen.getAllByText('Inactive');
    expect(inactiveBadges).toHaveLength(1);
  });

  it('shows last sync time for accounts with lastSync', () => {
    render(<AccountList accounts={mockAccounts} />);

    // Should show "Last synced" text for accounts with lastSync
    const lastSyncTexts = screen.getAllByText(/Last synced/);
    expect(lastSyncTexts).toHaveLength(2); // Only first two accounts have lastSync
  });

  it('applies selected styles to selected account', () => {
    render(<AccountList accounts={mockAccounts} selectedAccountId="acc-1" />);

    const selectedCard = screen
      .getByText('Checking Account')
      .closest('.rounded-lg');
    expect(selectedCard).toHaveClass('ring-2', 'ring-primary');
  });

  it('calls onSelectAccount when account is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <AccountList accounts={mockAccounts} onSelectAccount={handleSelect} />
    );

    const checkingAccount = screen
      .getByText('Checking Account')
      .closest('.rounded-lg');
    fireEvent.click(checkingAccount!);

    expect(handleSelect).toHaveBeenCalledWith('acc-1');
  });

  it('renders correct icons for different account types', () => {
    render(<AccountList accounts={mockAccounts} />);

    // Icons are rendered as SVGs inside cards
    const cards = document.querySelectorAll('.rounded-lg.border');
    expect(cards).toHaveLength(3);

    // Each card should have an icon container
    const iconContainers = document.querySelectorAll('.bg-gradient-to-br');
    expect(iconContainers).toHaveLength(3);
  });

  it('handles different currency types', () => {
    const eurAccount = {
      ...mockAccounts[0],
      id: 'acc-4',
      currency: 'EUR',
      balance: 1500.0,
    };

    render(<AccountList accounts={[eurAccount]} />);

    // Should format as EUR
    expect(
      screen.getByText(/€1[,.]500\.00|1[,.]500[,.]00\s*€/)
    ).toBeInTheDocument();
  });

  it('applies opacity to inactive accounts', () => {
    render(<AccountList accounts={mockAccounts} />);

    const investmentCard = screen
      .getByText('Investment Account')
      .closest('.rounded-lg');
    expect(investmentCard).toHaveClass('opacity-60');
  });

  it('handles unknown account types gracefully', () => {
    const unknownTypeAccount = {
      ...mockAccounts[0],
      id: 'acc-5',
      type: 'unknown_type',
      subtype: 'unknown_subtype',
    };

    render(<AccountList accounts={[unknownTypeAccount]} />);

    // Should show the raw type and subtype
    expect(
      screen.getByText('unknown_type - unknown_subtype')
    ).toBeInTheDocument();
  });

  it('does not show last sync for accounts without sync date', () => {
    render(<AccountList accounts={[mockAccounts[2]]} />);

    // Investment account has no lastSync
    expect(screen.queryByText(/Last synced/)).not.toBeInTheDocument();
  });

  it('maintains hover state on cards', () => {
    render(<AccountList accounts={[mockAccounts[0]]} />);

    const card = screen.getByText('Checking Account').closest('.rounded-lg');
    expect(card).toHaveClass('hover:shadow-lg');
  });
});
