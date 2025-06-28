import type { CancellationContext, CancellationStrategyResult } from "../types";
import { ApiProviderImplementation } from "../api-provider";

export class SpotifyProvider extends ApiProviderImplementation {
  name = "Spotify";

  async cancel(context: CancellationContext): Promise<CancellationStrategyResult> {
    const { subscription } = context;

    try {
      // Mock Spotify API cancellation
      // Spotify has better API support in production
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      const scenario = Math.random();

      if (scenario < 0.8) {
        // Success case
        const confirmationCode = `SPT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        const effectiveDate = new Date();
        
        // Calculate refund if applicable (Premium users who cancel mid-cycle)
        const daysRemaining = Math.floor(Math.random() * 30);
        const refundAmount = daysRemaining > 0 ? 
          Number((subscription.amount * (daysRemaining / 30)).toFixed(2)) : 
          undefined;

        return {
          success: true,
          confirmationCode,
          effectiveDate, // Spotify cancels immediately but access continues until end of period
          refundAmount,
        };
      } else if (scenario < 0.9) {
        // Rate limit
        return {
          success: false,
          error: {
            code: "API_RATE_LIMIT",
            message: "Too many cancellation attempts. Please try again in a few minutes.",
          },
        };
      } else {
        // Account issue
        return {
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: "This Spotify account has special billing (family plan, student discount) that requires manual cancellation.",
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to connect to Spotify",
          details: error,
        },
      };
    }
  }
}