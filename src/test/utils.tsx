import React from "react"
import { render } from "@testing-library/react"
import type { RenderOptions } from "@testing-library/react"
import { TRPCReactProvider } from "@/trpc/react"
import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

interface ProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

// Mock tRPC client - removed as it's not used
// Will be implemented when needed for specific tests

function AllTheProviders({ children, session = null }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </SessionProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: Session | null
}

const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  const { session, ...renderOptions } = options ?? {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Mock session data
export const mockSession: Session = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Mock subscription data
export const mockSubscription = {
  id: "sub-1",
  name: "Netflix",
  amount: 15.99,
  currency: "USD",
  frequency: "monthly" as const,
  nextBilling: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: "active" as const,
  category: "Streaming",
  provider: {
    name: "Netflix Inc.",
    logo: "https://example.com/netflix-logo.png",
  },
  lastTransaction: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
}

// Mock transaction data
export const mockTransaction = {
  id: "txn-1",
  date: new Date(),
  name: "Netflix Monthly Subscription",
  merchantName: "Netflix",
  amount: -15.99,
  currency: "USD",
  category: "Entertainment",
  pending: false,
  isRecurring: true,
  account: {
    name: "Checking Account",
    institution: "Chase Bank",
  },
  subscription: {
    id: "sub-1",
    name: "Netflix",
  },
}

// Mock bank connection data
export const mockBankConnection = {
  id: "plaid-1",
  institutionName: "Chase Bank",
  lastSync: new Date(),
  status: "connected" as const,
  error: null,
  accountCount: 2,
}

// Re-export everything
export * from "@testing-library/react"
export { customRender as render }