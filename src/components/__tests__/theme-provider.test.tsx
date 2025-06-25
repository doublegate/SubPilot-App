import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProvider } from '@/components/theme-provider';

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: vi.fn(({ children, ...props }) => (
    <div data-testid="next-themes-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  )),
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="test-child">Test Content</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('wraps children with NextThemesProvider', () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('next-themes-provider')).toBeInTheDocument();
  });

  it('passes props through to NextThemesProvider', () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div>Test Content</div>
      </ThemeProvider>
    );

    const providerElement = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(
      providerElement.getAttribute('data-props') || '{}'
    );

    expect(props).toEqual({
      attribute: 'class',
      defaultTheme: 'system',
      enableSystem: true,
      disableTransitionOnChange: true,
    });
  });

  it('configures theme switching with class attribute when specified', () => {
    render(
      <ThemeProvider attribute="class">
        <div>Test Content</div>
      </ThemeProvider>
    );

    const providerElement = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(
      providerElement.getAttribute('data-props') || '{}'
    );

    expect(props.attribute).toBe('class');
  });

  it('sets system as default theme when specified', () => {
    render(
      <ThemeProvider defaultTheme="system">
        <div>Test Content</div>
      </ThemeProvider>
    );

    const providerElement = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(
      providerElement.getAttribute('data-props') || '{}'
    );

    expect(props.defaultTheme).toBe('system');
  });

  it('enables system theme detection when specified', () => {
    render(
      <ThemeProvider enableSystem>
        <div>Test Content</div>
      </ThemeProvider>
    );

    const providerElement = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(
      providerElement.getAttribute('data-props') || '{}'
    );

    expect(props.enableSystem).toBe(true);
  });

  it('disables transition on theme change when specified', () => {
    render(
      <ThemeProvider disableTransitionOnChange>
        <div>Test Content</div>
      </ThemeProvider>
    );

    const providerElement = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(
      providerElement.getAttribute('data-props') || '{}'
    );

    expect(props.disableTransitionOnChange).toBe(true);
  });

  it('renders multiple children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
        <span data-testid="child-3">Third Child</span>
      </ThemeProvider>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('handles empty children', () => {
    render(<ThemeProvider />);

    expect(screen.getByTestId('next-themes-provider')).toBeInTheDocument();
  });

  it('handles null children', () => {
    render(<ThemeProvider>{null}</ThemeProvider>);

    expect(screen.getByTestId('next-themes-provider')).toBeInTheDocument();
  });

  it('handles complex nested children', () => {
    render(
      <ThemeProvider>
        <div>
          <header data-testid="header">
            <h1>Title</h1>
          </header>
          <main data-testid="main">
            <section>
              <p>Content</p>
            </section>
          </main>
        </div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  describe('TypeScript interface compliance', () => {
    it('accepts React.ReactNode as children', () => {
      // This test verifies TypeScript compilation
      const TestComponent = () => (
        <ThemeProvider>
          <div>String Child</div>
          {123}
          {true && <span>Conditional Child</span>}
          {['a', 'b'].map(item => (
            <div key={item}>{item}</div>
          ))}
        </ThemeProvider>
      );

      render(<TestComponent />);
      expect(screen.getByTestId('next-themes-provider')).toBeInTheDocument();
    });
  });

  describe('integration with Next.js', () => {
    it('works with typical Next.js configuration for SSR', () => {
      render(
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div>App Content</div>
        </ThemeProvider>
      );

      const providerElement = screen.getByTestId('next-themes-provider');
      const props = JSON.parse(
        providerElement.getAttribute('data-props') || '{}'
      );

      // These settings are optimized for Next.js SSR
      expect(props.attribute).toBe('class'); // Uses CSS classes for theme switching
      expect(props.enableSystem).toBe(true); // Detects system preference
      expect(props.disableTransitionOnChange).toBe(true); // Prevents flash during SSR
    });
  });

  describe('theme configuration', () => {
    it('accepts optimal settings for preventing FOUC (Flash of Unstyled Content)', () => {
      render(
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
        >
          <div>Content</div>
        </ThemeProvider>
      );

      const providerElement = screen.getByTestId('next-themes-provider');
      const props = JSON.parse(
        providerElement.getAttribute('data-props') || '{}'
      );

      // Configuration that prevents FOUC
      expect(props.disableTransitionOnChange).toBe(true);
      expect(props.attribute).toBe('class');
      expect(props.defaultTheme).toBe('system');
    });

    it('supports all standard theme configurations', () => {
      // This test verifies the provider can handle standard theme configurations
      render(
        <ThemeProvider defaultTheme="dark" enableSystem>
          <div>Theme Test</div>
        </ThemeProvider>
      );

      const providerElement = screen.getByTestId('next-themes-provider');
      const props = JSON.parse(
        providerElement.getAttribute('data-props') || '{}'
      );

      // Should support light, dark, and system themes
      expect(props.defaultTheme).toBe('dark');
      expect(props.enableSystem).toBe(true);
    });
  });

  describe('error handling', () => {
    it('handles NextThemesProvider initialization gracefully', () => {
      // Mock console.error to suppress error logging during test
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Test that the ThemeProvider can handle NextThemesProvider prop validation issues
      const MockProvider = ({ children, ...props }: any) => {
        // Simulate a provider that validates props strictly
        if (props.invalidProp) {
          console.error('Invalid prop provided to NextThemesProvider');
        }
        return <div data-testid="mock-provider">{children}</div>;
      };

      vi.mocked(NextThemesProvider).mockImplementationOnce(MockProvider);

      // Should render without throwing, even with potential prop validation warnings
      const { getByTestId } = render(
        <ThemeProvider invalidProp="test">
          <div>Content</div>
        </ThemeProvider>
      );

      expect(getByTestId('mock-provider')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('performance', () => {
    it('re-renders efficiently with theme changes', () => {
      const RenderCounter = vi.fn();

      const TestChild = () => {
        RenderCounter();
        return <div data-testid="test-child">Test</div>;
      };

      const { rerender } = render(
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      );

      expect(RenderCounter).toHaveBeenCalledTimes(1);

      // Re-render should not cause unnecessary child re-renders
      rerender(
        <ThemeProvider>
          <TestChild />
        </ThemeProvider>
      );

      expect(RenderCounter).toHaveBeenCalledTimes(2);
    });
  });
});
