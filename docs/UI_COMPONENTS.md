# UI Components Guide

**Last Updated**: 2025-06-26 12:24 AM EDT  
**Version**: v0.1.9  
**Component Library**: shadcn/ui with custom Tailwind theme

## Overview

SubPilot uses [shadcn/ui](https://ui.shadcn.com/) components with a custom Tailwind CSS theme. All components support Light/Dark/Auto theme modes through the next-themes integration.

## Theme System

### Theme Provider Setup

The application uses `next-themes` for theme management:

```tsx
// src/app/layout.tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### Theme Toggle Component

Located in `src/components/theme-toggle.tsx`, provides three modes:
- **Light Mode**: Bright UI with white backgrounds
- **Dark Mode**: Dark UI with gray/black backgrounds  
- **System Mode**: Follows OS preference automatically

### Recent Theme Fixes (2025-06-26)

#### Input Field Theme Support
Fixed text input fields not properly following theme on:
- **Profile Page**: All form inputs now respect dark/light theme
- **Settings/Billing Page**: Text fields properly styled for both themes

#### Implementation Details
All input components now include proper dark mode classes:
```tsx
<Input
  className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
  // ... other props
/>
```

## Core Components

### 1. Button
- **Location**: `src/components/ui/button.tsx`
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon

### 2. Card
- **Location**: `src/components/ui/card.tsx`
- **Components**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Dark Mode**: Automatically adjusts background and border colors

### 3. Input
- **Location**: `src/components/ui/input.tsx`
- **Theme Support**: Full dark/light mode compatibility
- **Recent Fix**: Now properly follows theme on all pages

### 4. Select
- **Location**: `src/components/ui/select.tsx`
- **Components**: Select, SelectTrigger, SelectContent, SelectItem
- **Portal Rendering**: Dropdown renders in portal for proper z-index

### 5. Dialog
- **Location**: `src/components/ui/dialog.tsx`
- **Components**: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter
- **Overlay**: Semi-transparent backdrop with theme support

### 6. Dropdown Menu
- **Location**: `src/components/ui/dropdown-menu.tsx`
- **Components**: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
- **Usage**: User menu, actions, theme toggle

### 7. Tabs
- **Location**: `src/components/ui/tabs.tsx`
- **Components**: Tabs, TabsList, TabsTrigger, TabsContent
- **Usage**: Settings page organization

### 8. Badge
- **Location**: `src/components/ui/badge.tsx`
- **Variants**: default, secondary, destructive, outline
- **Usage**: Status indicators, tags

### 9. Avatar
- **Location**: `src/components/ui/avatar.tsx`
- **Components**: Avatar, AvatarImage, AvatarFallback
- **Usage**: User profile pictures

### 10. Tooltip
- **Location**: `src/components/ui/tooltip.tsx`
- **Components**: Tooltip, TooltipTrigger, TooltipContent
- **Recent Addition**: Calendar date tooltips for subscription lists

## Custom Components

### Dashboard Components

#### SubscriptionCard
- **Location**: `src/components/subscription-card.tsx`
- **Features**: Status badge, amount display, actions dropdown
- **Theme**: Full dark mode support

#### DashboardStats
- **Location**: `src/components/dashboard-stats.tsx`
- **Features**: Key metrics display with trend indicators
- **Cards**: Total subscriptions, monthly spend, yearly spend, active services

#### BankConnectionCard
- **Location**: `src/components/bank-connection-card.tsx`
- **Features**: Bank account display, connection status
- **Theme**: Proper dark mode styling

### Analytics Components

#### UpcomingRenewalsCalendar
- **Location**: `src/components/analytics/upcoming-renewals-calendar.tsx`
- **Recent Fixes (2025-06-26)**:
  - Fixed overflow issues with long subscription lists
  - Added hover tooltips showing full subscription lists
  - Truncated display with "..." for dates with many subscriptions
  - Improved layout to prevent content overlap

## Design System

### Color Palette

```css
/* Primary Colors */
--primary: cyan-500 (#06B6D4)
--primary-foreground: white

/* Accent Colors */
--accent: purple-600 (#9333EA)
--accent-foreground: white

/* Background Colors */
--background: white (light) / gray-900 (dark)
--foreground: gray-900 (light) / gray-50 (dark)

/* Card Colors */
--card: white (light) / gray-800 (dark)
--card-foreground: gray-900 (light) / gray-50 (dark)
```

### Typography

- **Font Family**: Inter (system font stack fallback)
- **Heading Sizes**: 
  - H1: 2.5rem (40px)
  - H2: 2rem (32px)
  - H3: 1.5rem (24px)
  - H4: 1.25rem (20px)
- **Body Text**: 1rem (16px)
- **Small Text**: 0.875rem (14px)

### Spacing Scale

Using Tailwind's default spacing scale:
- 1 = 0.25rem (4px)
- 2 = 0.5rem (8px)
- 3 = 0.75rem (12px)
- 4 = 1rem (16px)
- 6 = 1.5rem (24px)
- 8 = 2rem (32px)

## Best Practices

### 1. Theme-Aware Styling

Always include dark mode classes for custom components:
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  Content
</div>
```

### 2. Form Inputs

Ensure all form inputs have proper theme support:
```tsx
<Input
  className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
  placeholder="Enter value..."
/>
```

### 3. Hover States

Include hover states for both themes:
```tsx
<button className="hover:bg-gray-100 dark:hover:bg-gray-700">
  Click me
</button>
```

### 4. Focus States

Maintain accessibility with visible focus states:
```tsx
<Input className="focus:ring-2 focus:ring-primary focus:ring-offset-2" />
```

### 5. Portal Components

For dropdowns and modals, ensure they render in portals:
```tsx
<DropdownMenuContent className="z-50">
  {/* Content */}
</DropdownMenuContent>
```

## Component Usage Examples

### Theme Toggle Implementation

```tsx
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Calendar Tooltip Implementation

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="calendar-date">
      {subscriptions.slice(0, 2).map(sub => (
        <div key={sub.id}>{sub.name}</div>
      ))}
      {subscriptions.length > 2 && <div>...</div>}
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <div className="space-y-1">
      {subscriptions.map(sub => (
        <div key={sub.id}>{sub.name} - ${sub.amount}</div>
      ))}
    </div>
  </TooltipContent>
</Tooltip>
```

## Testing Components

### Theme Testing

```tsx
// Test both light and dark themes
describe("Component", () => {
  it("renders correctly in light theme", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Component />
      </ThemeProvider>
    );
    // assertions
  });

  it("renders correctly in dark theme", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <Component />
      </ThemeProvider>
    );
    // assertions
  });
});
```

### Portal Component Testing

```tsx
// Use findBy queries for portal-rendered content
const trigger = screen.getByRole("button");
await userEvent.click(trigger);

const menuItem = await screen.findByText("Menu Item");
expect(menuItem).toBeInTheDocument();
```

## Accessibility

### ARIA Labels

All interactive components should have proper ARIA labels:
```tsx
<Button aria-label="Open menu">
  <Menu className="h-4 w-4" />
</Button>
```

### Keyboard Navigation

Ensure all components are keyboard accessible:
- Tab navigation through focusable elements
- Enter/Space to activate buttons
- Escape to close modals/dropdowns
- Arrow keys for menu navigation

### Color Contrast

Maintain WCAG AA compliance:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

## Performance Optimization

### Component Lazy Loading

```tsx
const HeavyComponent = lazy(() => import("./HeavyComponent"));

<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```tsx
const MemoizedComponent = memo(({ data }) => {
  // Component implementation
});
```

## Future Enhancements

1. **Animation System**: Framer Motion integration for smooth transitions
2. **Component Variants**: Additional color schemes and sizes
3. **Accessibility Audit**: Full WCAG AAA compliance
4. **Performance Monitoring**: Component render tracking
5. **Storybook Integration**: Interactive component documentation

---

*This guide documents the UI component system used in SubPilot v0.1.9. All components support full theme switching and have been tested for accessibility and performance.*