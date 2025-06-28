import type { CancellationContext, CancellationStrategyResult } from "../types";
import { ApiProviderImplementation } from "../api-provider";

export class AdobeProvider extends ApiProviderImplementation {
  name = "Adobe";

  async cancel(context: CancellationContext): Promise<CancellationStrategyResult> {
    const { subscription } = context;

    try {
      // Mock Adobe API cancellation
      // Adobe is known for complex cancellation policies
      
      await new Promise(resolve => setTimeout(resolve, 3000));

      const scenario = Math.random();

      if (scenario < 0.5) {
        // Success case
        const confirmationCode = `ADBE-${Date.now()}-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
        const effectiveDate = new Date();
        effectiveDate.setDate(effectiveDate.getDate() + 30);

        // Adobe often charges cancellation fees
        const monthsRemaining = Math.floor(Math.random() * 6);
        const cancellationFee = monthsRemaining > 0 ? 
          Number((subscription.amount * 0.5 * monthsRemaining).toFixed(2)) : 
          0;

        return {
          success: true,
          confirmationCode,
          effectiveDate,
          // Negative refund indicates a fee
          refundAmount: cancellationFee > 0 ? -cancellationFee : undefined,
        };
      } else if (scenario < 0.7) {
        // Contract restriction
        return {
          success: false,
          error: {
            code: "BILLING_CYCLE_RESTRICTION",
            message: "Your Adobe subscription is under an annual contract. Early cancellation fees may apply. Please contact Adobe support.",
          },
        };
      } else if (scenario < 0.85) {
        // Retention offer
        return {
          success: false,
          error: {
            code: "RETENTION_OFFER",
            message: "Adobe is offering you 2 months free to keep your subscription. Visit your Adobe account to accept or decline this offer.",
          },
        };
      } else {
        // Auth failure
        return {
          success: false,
          error: {
            code: "AUTH_FAILED",
            message: "Unable to authenticate with Adobe. Please log in to your Adobe account and try again.",
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to connect to Adobe",
          details: error,
        },
      };
    }
  }
}