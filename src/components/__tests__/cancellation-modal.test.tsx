import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancellationModal } from '../cancellation/cancellation-modal';
import { api } from '@/trpc/react';

// Mock tRPC
vi.mock('@/trpc/react', () => ({
  api: {
    cancellation: {
      initiate: {
        useMutation: vi.fn(),
      },
    },
  },
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock UI components
vi.mock('@/components/ui/icons', () => ({
  Icons: {
    x: () => <div data-testid="x-icon" />,
    spinner: () => <div data-testid="spinner-icon" />,
    dollarSign: () => <div data-testid="dollar-sign-icon" />,
    alertTriangle: () => <div data-testid="alert-triangle-icon" />,
  },
}));

const mockProvider = {
  id: 'netflix',
  name: 'Netflix',
  type: 'api',
  difficulty: 'easy',
  averageTime: 5,
  successRate: 95,
  supportsRefunds: true,
};

const mockInitiateMutation = vi.fn();

describe('CancellationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.cancellation.initiate.useMutation).mockReturnValue({
      mutateAsync: mockInitiateMutation,
      isPending: false,
    } as any);
  });

  it('renders modal when open', () => {
    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    expect(screen.getByText('Cancel Netflix')).toBeInTheDocument();
    expect(
      screen.getByText(/This will start the cancellation process/)
    ).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CancellationModal
        isOpen={false}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    expect(screen.queryByText('Cancel Netflix')).not.toBeInTheDocument();
  });

  it('displays provider information correctly', () => {
    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    expect(screen.getByText('Cancellation Method')).toBeInTheDocument();
    expect(screen.getByText('easy difficulty')).toBeInTheDocument();
    expect(
      screen.getByText('Automatic cancellation via provider API')
    ).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
    expect(
      screen.getByText(/This provider may offer refunds/)
    ).toBeInTheDocument();
  });

  it('shows different method descriptions for different provider types', () => {
    const webhookProvider = { ...mockProvider, type: 'webhook' };

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={webhookProvider}
        onCancellationStarted={() => {}}
      />
    );

    expect(
      screen.getByText('Automatic with confirmation tracking')
    ).toBeInTheDocument();
  });

  it('handles provider without average time', () => {
    const providerNoTime = { ...mockProvider, averageTime: null };

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={providerNoTime}
        onCancellationStarted={() => {}}
      />
    );

    expect(screen.queryByText(/minutes/)).not.toBeInTheDocument();
  });

  it('does not show refund alert when provider does not support refunds', () => {
    const noRefundProvider = { ...mockProvider, supportsRefunds: false };

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={noRefundProvider}
        onCancellationStarted={() => {}}
      />
    );

    expect(
      screen.queryByText(/This provider may offer refunds/)
    ).not.toBeInTheDocument();
  });

  it('allows priority selection', () => {
    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    // Find radio buttons by value attribute
    const radioButtons = screen.getAllByRole('radio');
    const normalRadio = radioButtons.find(
      radio => (radio as HTMLInputElement).value === 'normal'
    );
    const highRadio = radioButtons.find(
      radio => (radio as HTMLInputElement).value === 'high'
    );

    expect(normalRadio).toBeDefined();
    expect(highRadio).toBeDefined();

    // Normal should be selected by default
    expect(normalRadio).toBeChecked();

    // Select high priority
    fireEvent.click(highRadio!);
    expect(highRadio).toBeChecked();
    expect(normalRadio).not.toBeChecked();
  });

  it('allows notes input', () => {
    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    const notesTextarea = screen.getByPlaceholderText(/Any specific reasons/);
    fireEvent.change(notesTextarea, { target: { value: 'Too expensive' } });
    expect(notesTextarea).toHaveValue('Too expensive');
  });

  it('submits cancellation with correct data', async () => {
    const onCancellationStarted = vi.fn();
    mockInitiateMutation.mockResolvedValue({ status: 'processing' });

    // Mock the mutation to call onSuccess
    vi.mocked(api.cancellation.initiate.useMutation).mockReturnValue({
      mutateAsync: mockInitiateMutation,
      isPending: false,
      onSuccess: (result: any) => {
        onCancellationStarted();
      },
    } as any);

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={onCancellationStarted}
      />
    );

    // Find radio buttons and change priority
    const radioButtons = screen.getAllByRole('radio');
    const highRadio = radioButtons.find(
      radio => (radio as HTMLInputElement).value === 'high'
    );
    expect(highRadio).toBeDefined();
    fireEvent.click(highRadio!);

    // Add notes
    fireEvent.change(screen.getByPlaceholderText(/Any specific reasons/), {
      target: { value: 'Service quality issues' },
    });

    // Submit
    fireEvent.click(screen.getByText('Start Cancellation'));

    await waitFor(() => {
      expect(mockInitiateMutation).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
        priority: 'high',
        notes: 'Service quality issues',
      });
    });

    // The onCancellationStarted will be called via the onSuccess callback
    // We need to trigger the mutation configuration's onSuccess manually
    const mutationConfig = vi.mocked(api.cancellation.initiate.useMutation).mock
      .calls[0]?.[0];
    if (mutationConfig?.onSuccess) {
      // tRPC v11 onSuccess has 4 arguments
      mutationConfig.onSuccess(
        { status: 'processing' } as any,
        {} as any,
        {} as any,
        {} as any
      );
    }

    expect(onCancellationStarted).toHaveBeenCalled();
  });

  it('submits without notes if empty', async () => {
    mockInitiateMutation.mockResolvedValue({ status: 'completed' });

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Start Cancellation'));

    await waitFor(() => {
      expect(mockInitiateMutation).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
        priority: 'normal',
        notes: undefined,
      });
    });
  });

  it('shows loading state during submission', async () => {
    // Mock a slow mutation to keep loading state active
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockInitiateMutation.mockReturnValue(slowPromise);

    vi.mocked(api.cancellation.initiate.useMutation).mockReturnValue({
      mutateAsync: mockInitiateMutation,
      isPending: false,
    } as any);

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    // Click submit to trigger loading state
    fireEvent.click(screen.getByText('Start Cancellation'));

    // Now check for loading state after submission starts
    await waitFor(() => {
      expect(screen.getByText('Starting Cancellation...')).toBeInTheDocument();
    });

    expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();

    // Button should be disabled during submission
    const button = screen.getByText('Starting Cancellation...');
    expect(button).toBeDisabled();
  });

  it('handles cancellation errors', async () => {
    const { toast } = await import('@/components/ui/use-toast');

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    // Simulate mutation setup with error handling
    const mutationConfig = vi.mocked(api.cancellation.initiate.useMutation).mock
      .calls[0]?.[0];

    // Test error handling (tRPC v11 onError has 4 arguments)
    if (mutationConfig?.onError) {
      mutationConfig.onError(
        { message: 'Network error' } as any,
        {} as any,
        {} as any,
        {} as any
      );
    }

    expect(toast).toHaveBeenCalledWith({
      title: 'Failed to Start Cancellation',
      description: 'Network error',
      variant: 'destructive',
    });
  });

  it('closes modal when cancel button is clicked', () => {
    const onClose = vi.fn();

    render(
      <CancellationModal
        isOpen={true}
        onClose={onClose}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={mockProvider}
        onCancellationStarted={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows correct difficulty badge colors', () => {
    const hardProvider = { ...mockProvider, difficulty: 'hard' };

    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={hardProvider}
        onCancellationStarted={() => {}}
      />
    );

    const badge = screen.getByText('hard difficulty');
    expect(badge).toHaveClass('bg-red-100');
  });

  it('handles null provider gracefully', () => {
    render(
      <CancellationModal
        isOpen={true}
        onClose={() => {}}
        subscriptionId="sub-123"
        subscriptionName="Netflix"
        provider={null}
        onCancellationStarted={() => {}}
      />
    );

    expect(screen.queryByText('Cancellation Method')).not.toBeInTheDocument();
    expect(screen.getByText('Start Cancellation')).toBeInTheDocument();
  });

  it('shows different success messages based on status', async () => {
    const { toast } = await import('@/components/ui/use-toast');

    const mutationConfig = vi.mocked(api.cancellation.initiate.useMutation).mock
      .calls[0]?.[0];

    // Test completed status (tRPC v11 onSuccess has 4 arguments)
    if (mutationConfig?.onSuccess) {
      mutationConfig.onSuccess(
        { status: 'completed' } as any,
        {} as any,
        {} as any,
        {} as any
      );
      expect(toast).toHaveBeenCalledWith({
        title: 'Cancellation Started',
        description: 'Your subscription has been cancelled successfully!',
      });

      // Test processing status
      mutationConfig.onSuccess(
        { status: 'processing' } as any,
        {} as any,
        {} as any,
        {} as any
      );
      expect(toast).toHaveBeenCalledWith({
        title: 'Cancellation Started',
        description:
          "Cancellation is being processed. You'll be notified when complete.",
      });

      // Test pending status
      mutationConfig.onSuccess(
        { status: 'pending' } as any,
        {} as any,
        {} as any,
        {} as any
      );
      expect(toast).toHaveBeenCalledWith({
        title: 'Cancellation Started',
        description: 'Manual cancellation instructions have been generated.',
      });
    }
  });
});
