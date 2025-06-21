import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login")
    
    // Check page title
    await expect(page).toHaveTitle(/Login/)
    
    // Check for login form elements
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /continue with email/i })).toBeVisible()
    
    // Check for OAuth buttons
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible()
  })

  test("should redirect to dashboard when accessing protected route", async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto("/dashboard")
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
    
    // Should have callback URL parameter
    const url = new URL(page.url())
    expect(url.searchParams.get("callbackUrl")).toBe("/dashboard")
  })

  test("should show error for invalid email", async ({ page }) => {
    await page.goto("/login")
    
    // Enter invalid email
    await page.fill('input[type="email"]', "invalid-email")
    await page.click('button:has-text("Continue with Email")')
    
    // Should show validation error
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test("should navigate to signup page", async ({ page }) => {
    await page.goto("/login")
    
    // Click signup link
    await page.click('a:has-text("Sign up")')
    
    // Should be on signup page
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.getByRole("heading", { name: /create.*account/i })).toBeVisible()
  })
})