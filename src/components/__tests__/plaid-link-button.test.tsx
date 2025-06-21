import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { PlaidLinkButton } from '@/components/plaid-link-button';

// Mock react-plaid-link
const mockOpen = vi.fn();
const mockReady = vi.fn();

vi.mock('react-plaid-link', () => ({
  usePlaidLink: vi.fn(() => ({
    open: mockOpen,
    ready: mockReady.mockReturnValue(true),
  })),
}));

// Mock tRPC
const mockCreateLinkToken = vi.fn();
const mockExchangePublicToken = vi.fn();

vi.mock('@/trpc/react', () => ({
  api: {
    plaid: {
      createLinkToken: {
        useQuery: () => ({
          data: { linkToken: 'test-link-token' },
          isLoading: false,
        }),
      },
      exchangePublicToken: {
        useMutation: () => ({
          mutate: mockExchangePublicToken,
          isLoading: false,
        }),
      },
    },
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PlaidLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReady.mockReturnValue(true);
  });

  it('renders connect bank account button', () => {
    render(<PlaidLinkButton />);

    expect(screen.getByText(/connect bank account/i)).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('shows loading state when link token is loading', () => {
    const { usePlaidLink } = require('react-plaid-link');
    const mockApi = require('@/trpc/react').api;
    
    mockApi.plaid.createLinkToken.useQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<PlaidLinkButton />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables button when not ready', () => {
    mockReady.mockReturnValue(false);

    render(<PlaidLinkButton />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('opens Plaid Link when clicked', async () => {
    render(<PlaidLinkButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalled();
    });
  });

  it('handles successful bank connection', async () => {
    const mockToast = require('sonner').toast;
    const mockRouter = require('next/navigation').useRouter();

    // Simulate successful public token exchange
    mockExchangePublicToken.mockImplementation((params) => {
      params.onSuccess?.();
    });

    render(<PlaidLinkButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Bank account connected successfully!');
      expect(mockRouter().refresh).toHaveBeenCalled();
    });
  });

  it('handles connection errors', async () => {
    const mockToast = require('sonner').toast;

    mockExchangePublicToken.mockImplementation((params) => {
      params.onError?.(new Error('Connection failed'));
    });

    render(<PlaidLinkButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect bank account')
      );
    });
  });

  it('calls onSuccess callback when provided', async () => {
    const mockOnSuccess = vi.fn();

    render(<PlaidLinkButton onSuccess={mockOnSuccess} />);

    // Simulate successful connection
    mockExchangePublicToken.mockImplementation((params) => {
      params.onSuccess?.();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('applies custom className', () => {
    render(<PlaidLinkButton className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('shows different text based on state', () => {
    const mockApi = require('@/trpc/react').api;
    
    // Test loading state
    mockApi.plaid.createLinkToken.useQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { rerender } = render(<PlaidLinkButton />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();

    // Test ready state
    mockApi.plaid.createLinkToken.useQuery.mockReturnValue({
      data: { linkToken: 'test-token' },
      isLoading: false,
    });

    rerender(<PlaidLinkButton />);
    expect(screen.getByText(/connect bank account/i)).toBeInTheDocument();
  });

  it('handles Plaid Link configuration properly', () => {
    const { usePlaidLink } = require('react-plaid-link');
    
    render(<PlaidLinkButton />);

    expect(usePlaidLink).toHaveBeenCalledWith({
      token: 'test-link-token',
      onSuccess: expect.any(Function),
      onExit: expect.any(Function),
    });
  });

  it('processes metadata correctly on successful connection', async () => {
    const mockMetadata = {
      institution: {
        name: 'Chase Bank',
        institution_id: 'ins_1',
      },
      accounts: [
        {
          id: 'acc_1',
          name: 'Checking Account',
          type: 'depository',
          subtype: 'checking',
          mask: '0000',
        },
      ],
    };

    const { usePlaidLink } = require('react-plaid-link');
    let onSuccessCallback: (publicToken: string, metadata: any) => void;

    usePlaidLink.mockImplementation((config: any) => {
      onSuccessCallback = config.onSuccess;
      return { open: mockOpen, ready: true };
    });

    render(<PlaidLinkButton />);

    // Simulate successful Plaid Link flow
    onSuccessCallback('public-token-123', mockMetadata);

    await waitFor(() => {
      expect(mockExchangePublicToken).toHaveBeenCalledWith({
        publicToken: 'public-token-123',
        metadata: {
          institution: {
            name: 'Chase Bank',
            institution_id: 'ins_1',
          },
          accounts: expect.any(Array),
        },
      });
    });
  });

  it('handles Plaid Link exit gracefully', () => {
    const { usePlaidLink } = require('react-plaid-link');
    let onExitCallback: (error: any) => void;

    usePlaidLink.mockImplementation((config: any) => {
      onExitCallback = config.onExit;
      return { open: mockOpen, ready: true };
    });

    render(<PlaidLinkButton />);

    // Simulate user exit without error
    onExitCallback(null);

    // Should not show any error messages
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('logs Plaid Link errors on exit', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { usePlaidLink } = require('react-plaid-link');
    let onExitCallback: (error: any) => void;

    usePlaidLink.mockImplementation((config: any) => {
      onExitCallback = config.onExit;
      return { open: mockOpen, ready: true };
    });

    render(<PlaidLinkButton />);

    const mockError = { error_code: 'INVALID_CREDENTIALS' };
    onExitCallback(mockError);

    expect(consoleSpy).toHaveBeenCalledWith('Plaid Link error:', mockError);
    
    consoleSpy.mockRestore();
  });
});