import { Configuration, PlaidApi, PlaidEnvironments } from "plaid"
import { env } from "@/env.js"

/**
 * Plaid client configuration
 * This client is used for all server-side Plaid API calls
 */
export const getPlaidClient = () => {
  // Check if Plaid credentials are configured
  if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
    console.warn("Plaid credentials not configured. Plaid features will be disabled.")
    return null
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
        "PLAID-SECRET": env.PLAID_SECRET,
      },
    },
  })

  return new PlaidApi(configuration)
}

// Singleton instance
let plaidClient: PlaidApi | null = null

export const plaid = () => {
  if (!plaidClient) {
    plaidClient = getPlaidClient()
  }
  return plaidClient
}

/**
 * Helper to check if Plaid is configured
 */
export const isPlaidConfigured = () => {
  return !!(env.PLAID_CLIENT_ID && env.PLAID_SECRET)
}

/**
 * Plaid webhook verification
 * Verifies the JWT signature from Plaid webhooks
 */
export const verifyPlaidWebhook = async (
  body: string,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> => {
  // TODO: Implement webhook verification using plaid.webhookVerificationKeyGet()
  // For now, return true in development
  if (env.NODE_ENV === "development") {
    return true
  }
  
  // In production, we should verify the webhook signature
  console.warn("Plaid webhook verification not implemented")
  return false
}

/**
 * Error handler for Plaid API errors
 */
export const handlePlaidError = (error: any) => {
  if (error.response?.data) {
    const plaidError = error.response.data
    console.error("Plaid API Error:", {
      error_type: plaidError.error_type,
      error_code: plaidError.error_code,
      error_message: plaidError.error_message,
      display_message: plaidError.display_message,
      request_id: plaidError.request_id,
    })
    
    // Return user-friendly error message
    return {
      message: plaidError.display_message || "An error occurred connecting to your bank",
      code: plaidError.error_code,
      type: plaidError.error_type,
    }
  }
  
  console.error("Unknown Plaid Error:", error)
  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    type: "API_ERROR",
  }
}