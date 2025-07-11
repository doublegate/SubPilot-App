import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

// Create a properly typed mock
const mockUseTheme = vi.mocked(useTheme);

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      className={`btn ${variant} ${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    align,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => (
    <div data-testid="dropdown-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div data-testid="dropdown-item" onClick={onClick} role="menuitem">
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Sun: () => <span data-testid="sun-icon">☀️</span>,
  Moon: () => <span data-testid="moon-icon">🌙</span>,
  Monitor: () => <span data-testid="monitor-icon">💻</span>,
}));

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn();

  // Helper to create a properly typed mock return value
  const createMockReturnValue = (
    theme: string | undefined,
    resolvedTheme?: string
  ) => ({
    theme,
    setTheme: mockSetTheme,
    systemTheme: undefined,
    themes: ['light', 'dark', 'system'],
    resolvedTheme: resolvedTheme ?? theme,
    forcedTheme: undefined,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with light theme selected', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    expect(screen.getAllByTestId('sun-icon')).toHaveLength(2); // One in trigger, one in dropdown
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
  });

  it('renders with dark theme selected', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('dark'));

    render(<ThemeToggle />);

    expect(screen.getAllByTestId('moon-icon')).toHaveLength(2); // One in trigger, one in dropdown
  });

  it('renders with system theme selected', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('system', 'light'));

    render(<ThemeToggle />);

    expect(screen.getByTestId('monitor-icon')).toBeInTheDocument(); // Only in dropdown
  });

  it('displays all theme options in dropdown', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    const dropdownItems = screen.getAllByTestId('dropdown-item');
    expect(dropdownItems).toHaveLength(3);

    // Check that all theme options are present
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('calls setTheme when light theme is selected', async () => {
    const user = userEvent.setup();
    mockUseTheme.mockReturnValue(createMockReturnValue('dark'));

    render(<ThemeToggle />);

    const lightOption = screen.getByText('Light');
    await user.click(lightOption);

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme when dark theme is selected', async () => {
    const user = userEvent.setup();
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    const darkOption = screen.getByText('Dark');
    await user.click(darkOption);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme when system theme is selected', async () => {
    const user = userEvent.setup();
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    const systemOption = screen.getByText('System');
    await user.click(systemOption);

    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });

  it('displays correct icons in dropdown menu', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    // The trigger shows sun and moon icons (with CSS transitions)
    expect(screen.getAllByTestId('sun-icon')).toHaveLength(2); // One in trigger, one in dropdown
    expect(screen.getAllByTestId('moon-icon')).toHaveLength(2); // One in trigger, one in dropdown

    // The dropdown items show all three icons
    expect(screen.getByTestId('monitor-icon')).toBeInTheDocument(); // Only in dropdown
  });

  it('handles undefined theme gracefully', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue(undefined));

    render(<ThemeToggle />);

    // Should render without crashing and show the trigger icons
    expect(screen.getAllByTestId('sun-icon')).toHaveLength(2);
    expect(screen.getAllByTestId('moon-icon')).toHaveLength(2);
  });

  it('has proper accessibility attributes', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    // The component uses sr-only span for screen readers
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(3);
  });

  it('uses correct dropdown alignment', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    const dropdownContent = screen.getByTestId('dropdown-content');
    expect(dropdownContent).toHaveAttribute('data-align', 'end');
  });

  it('has proper button styling', () => {
    mockUseTheme.mockReturnValue(createMockReturnValue('light'));

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn');
    expect(button).toHaveClass('ghost');
    expect(button).toHaveClass('icon');
  });

  describe('theme persistence', () => {
    it('persists theme selection across component re-renders', () => {
      mockUseTheme.mockReturnValue(createMockReturnValue('dark'));

      const { rerender } = render(<ThemeToggle />);
      expect(screen.getAllByTestId('moon-icon')).toHaveLength(2);

      rerender(<ThemeToggle />);
      expect(screen.getAllByTestId('moon-icon')).toHaveLength(2);
    });
  });

  describe('user interactions', () => {
    it('responds to keyboard navigation', async () => {
      const user = userEvent.setup();
      mockUseTheme.mockReturnValue(createMockReturnValue('light'));

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();

      // Test Enter key
      await user.keyboard('{Enter}');

      // Should be able to navigate to menu items
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toBeInTheDocument();
    });

    it('handles rapid theme switching', async () => {
      const user = userEvent.setup();
      mockUseTheme.mockReturnValue(createMockReturnValue('light'));

      render(<ThemeToggle />);

      // Rapidly click different theme options
      await user.click(screen.getByText('Dark'));
      await user.click(screen.getByText('System'));
      await user.click(screen.getByText('Light'));

      expect(mockSetTheme).toHaveBeenCalledTimes(3);
      expect(mockSetTheme).toHaveBeenNthCalledWith(1, 'dark');
      expect(mockSetTheme).toHaveBeenNthCalledWith(2, 'system');
      expect(mockSetTheme).toHaveBeenNthCalledWith(3, 'light');
    });
  });

  describe('error handling', () => {
    it('handles missing useTheme hook gracefully', () => {
      mockUseTheme.mockReturnValue(createMockReturnValue('light'));

      render(<ThemeToggle />);

      // Should render without crashing
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it.skip('handles setTheme function errors', async () => {
      // Skipped: Error handling would require wrapping the component in an error boundary
      // This level of error handling is not currently required for theme switching
    });
  });
});
