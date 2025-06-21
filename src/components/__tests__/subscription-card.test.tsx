import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@/test/utils"
import { SubscriptionCard } from "@/components/subscription-card"
import { mockSubscription } from "@/test/utils"

describe("SubscriptionCard", () => {
  it("renders subscription information correctly", () => {
    render(<SubscriptionCard subscription={mockSubscription} />)
    
    expect(screen.getByText("Netflix")).toBeInTheDocument()
    expect(screen.getByText("$15.99")).toBeInTheDocument()
    expect(screen.getByText("Monthly")).toBeInTheDocument()
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("Streaming")).toBeInTheDocument()
  })

  it("shows upcoming billing warning when renewal is within 7 days", () => {
    const upcomingSubscription = {
      ...mockSubscription,
      nextBilling: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    }
    
    render(<SubscriptionCard subscription={upcomingSubscription} />)
    
    expect(screen.getByText(/Next billing:/)).toBeInTheDocument()
    expect(screen.getByText(/in 3 days/)).toBeInTheDocument()
  })

  it("shows cancelled state correctly", () => {
    const cancelledSubscription = {
      ...mockSubscription,
      status: "cancelled" as const,
    }
    
    render(<SubscriptionCard subscription={cancelledSubscription} />)
    
    expect(screen.getByText("cancelled")).toBeInTheDocument()
    expect(screen.getByText("This subscription has been cancelled")).toBeInTheDocument()
  })

  it("calls onCancel when cancel menu item is clicked", async () => {
    const handleCancel = vi.fn()
    render(<SubscriptionCard subscription={mockSubscription} onCancel={handleCancel} />)
    
    // Open dropdown menu
    const menuButton = screen.getByRole("button", { name: /open menu/i })
    fireEvent.click(menuButton)
    
    // Click cancel option
    const cancelButton = screen.getByText("Cancel Subscription")
    fireEvent.click(cancelButton)
    
    expect(handleCancel).toHaveBeenCalledWith(mockSubscription.id)
  })

  it("calls onUpdate when edit menu item is clicked", async () => {
    const handleUpdate = vi.fn()
    render(<SubscriptionCard subscription={mockSubscription} onUpdate={handleUpdate} />)
    
    // Open dropdown menu
    const menuButton = screen.getByRole("button", { name: /open menu/i })
    fireEvent.click(menuButton)
    
    // Click edit option
    const editButton = screen.getByText("Edit Subscription")
    fireEvent.click(editButton)
    
    expect(handleUpdate).toHaveBeenCalledWith(mockSubscription.id)
  })

  it("shows provider logo when available", () => {
    render(<SubscriptionCard subscription={mockSubscription} />)
    
    const logo = screen.getByAltText("Netflix Inc.")
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute("src", mockSubscription.provider!.logo)
  })

  it("shows fallback initial when no logo is available", () => {
    const subscriptionWithoutLogo = {
      ...mockSubscription,
      provider: {
        name: "Netflix Inc.",
        logo: null,
      },
    }
    
    render(<SubscriptionCard subscription={subscriptionWithoutLogo} />)
    
    expect(screen.getByText("N")).toBeInTheDocument()
  })
})