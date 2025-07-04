import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PremiumFeatureGate,
  useFeatureAccess,
} from '../billing/premium-feature-gate';
import { api } from '@/trpc/react';

// Mock tRPC
vi.mock('@/trpc/react', () => ({
  api: {
    billing: {
      hasFeature: {
        useQuery: vi.fn(),
      },
      canPerformAction: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Mock the upgrade modal
vi.mock('../billing/upgrade-modal', () => ({
  UpgradeModal: ({
    open,
    feature,
    requiredPlan,
  }: {
    open: boolean;
    feature: string;
    requiredPlan: string;
  }) =>
    open ? (
      <div data-testid="upgrade-modal">
        Upgrade to {requiredPlan} for {feature}
      </div>
    ) : null,
}));

const mockHasFeature = vi.mocked(api.billing.hasFeature.useQuery);
const mockCanPerformAction = vi.mocked(api.billing.canPerformAction.useQuery);

describe('PremiumFeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user has access', () => {
    mockHasFeature.mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: { upgradeRequired: null },
    } as any);

    render(
      <PremiumFeatureGate feature="export_data">
        <div>Premium Content</div>
      </PremiumFeatureGate>
    );

    expect(screen.getByText('Premium Content')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
  });

  it('shows loading state while checking access', () => {
    mockHasFeature.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: undefined,
    } as any);

    render(
      <PremiumFeatureGate feature="export_data">
        <div>Premium Content</div>
      </PremiumFeatureGate>
    );

    // Look for spinner by class instead of role
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
  });

  it('shows fallback when user lacks access', () => {
    mockHasFeature.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: { upgradeRequired: 'pro', reason: 'Feature requires pro plan' },
    } as any);

    render(
      <PremiumFeatureGate
        feature="export_data"
        fallback={<div>Upgrade Required</div>}
      >
        <div>Premium Content</div>
      </PremiumFeatureGate>
    );

    expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
    expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
  });

  it('triggers upgrade modal when fallback is clicked', async () => {
    mockHasFeature.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: { upgradeRequired: 'pro', reason: 'Feature requires pro plan' },
    } as any);

    render(
      <PremiumFeatureGate
        feature="export_data"
        fallback={<button>Upgrade Required</button>}
      >
        <div>Premium Content</div>
      </PremiumFeatureGate>
    );

    fireEvent.click(screen.getByText('Upgrade Required'));

    await waitFor(() => {
      expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
    });
  });

  it('calls onAccessDenied when user lacks access', () => {
    const onAccessDenied = vi.fn();

    mockHasFeature.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: { upgradeRequired: 'pro' },
    } as any);

    render(
      <PremiumFeatureGate feature="export_data" onAccessDenied={onAccessDenied}>
        <div>Premium Content</div>
      </PremiumFeatureGate>
    );

    expect(onAccessDenied).toHaveBeenCalled();
  });

  it('handles different feature types', () => {
    mockHasFeature.mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    render(
      <PremiumFeatureGate feature="add_bank_account">
        <div>Bank Feature</div>
      </PremiumFeatureGate>
    );

    expect(mockHasFeature).toHaveBeenCalledWith({
      feature: 'add_bank_account',
    });
  });

  it('handles different required plan levels', () => {
    mockHasFeature.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: { upgradeRequired: 'enterprise' },
    } as any);

    render(
      <PremiumFeatureGate
        feature="invite_team_member"
        requiredPlan="enterprise"
        fallback={<div>Enterprise Required</div>}
      >
        <div>Team Feature</div>
      </PremiumFeatureGate>
    );

    fireEvent.click(screen.getByText('Enterprise Required'));

    expect(
      screen.getByText('Upgrade to enterprise for invite_team_member')
    ).toBeInTheDocument();
  });

  it('enables canPerformAction query only when access is denied', () => {
    mockHasFeature.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    render(
      <PremiumFeatureGate feature="export_data">
        <div>Content</div>
      </PremiumFeatureGate>
    );

    expect(mockCanPerformAction).toHaveBeenCalledWith(
      { action: 'export_data' },
      { enabled: true }
    );
  });

  it('disables canPerformAction query when access is granted', () => {
    mockHasFeature.mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    render(
      <PremiumFeatureGate feature="export_data">
        <div>Content</div>
      </PremiumFeatureGate>
    );

    expect(mockCanPerformAction).toHaveBeenCalledWith(
      { action: 'export_data' },
      { enabled: false }
    );
  });
});

// Test the useFeatureAccess hook
function TestComponent({ feature }: { feature: string }) {
  const { hasAccess, isLoading, checkAccess, showUpgradeModal } =
    useFeatureAccess(feature);

  return (
    <div>
      <div data-testid="has-access">{hasAccess.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <button onClick={() => checkAccess()}>Check Access</button>
      {showUpgradeModal && (
        <div data-testid="hook-upgrade-modal">Upgrade Modal</div>
      )}
    </div>
  );
}

describe('useFeatureAccess hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct access state', () => {
    mockHasFeature.mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: null,
    } as any);

    render(<TestComponent feature="export_data" />);

    expect(screen.getByTestId('has-access')).toHaveTextContent('true');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('returns loading state correctly', () => {
    mockHasFeature.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: null,
    } as any);

    render(<TestComponent feature="export_data" />);

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('checkAccess returns true when user has access', () => {
    mockHasFeature.mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    render(<TestComponent feature="export_data" />);

    fireEvent.click(screen.getByText('Check Access'));
    // Should not show upgrade modal
    expect(screen.queryByTestId('hook-upgrade-modal')).not.toBeInTheDocument();
  });

  it('checkAccess shows upgrade modal when user lacks access', () => {
    mockHasFeature.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    render(<TestComponent feature="export_data" />);

    fireEvent.click(screen.getByText('Check Access'));

    expect(screen.getByTestId('hook-upgrade-modal')).toBeInTheDocument();
  });

  it('handles undefined access data gracefully', () => {
    mockHasFeature.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    mockCanPerformAction.mockReturnValue({
      data: null,
    } as any);

    render(<TestComponent feature="export_data" />);

    expect(screen.getByTestId('has-access')).toHaveTextContent('false');
  });
});
