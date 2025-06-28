import { z } from "zod";
import type {
  CancellationProvider,
  CancellationContext,
  CancellationStrategyResult,
  ApiProviderConfig,
  CancellationErrorCode,
} from "./types";

// Provider-specific implementations
import { NetflixProvider } from "./implementations/netflix";
import { SpotifyProvider } from "./implementations/spotify";
import { AdobeProvider } from "./implementations/adobe";
import { AmazonProvider } from "./implementations/amazon";
import { AppleProvider } from "./implementations/apple";

export class ApiCancellationProvider implements CancellationProvider {
  name = "API Cancellation Provider";
  type = "api" as const;
  
  private providers: Map<string, ApiProviderImplementation>;

  constructor() {
    this.providers = new Map();
    
    // Register provider implementations
    this.registerProvider("netflix", new NetflixProvider());
    this.registerProvider("spotify", new SpotifyProvider());
    this.registerProvider("adobe", new AdobeProvider());
    this.registerProvider("amazon", new AmazonProvider());
    this.registerProvider("apple", new AppleProvider());
  }

  private registerProvider(name: string, provider: ApiProviderImplementation) {
    this.providers.set(name.toLowerCase(), provider);
  }

  async cancel(context: CancellationContext): Promise<CancellationStrategyResult> {
    const { request, subscription, provider } = context;

    if (!provider || provider.type !== "api") {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_OPERATION",
          message: "Provider does not support API cancellation",
        },
      };
    }

    // Get provider implementation
    const providerName = provider.normalizedName.toLowerCase();
    const implementation = this.providers.get(providerName);

    if (!implementation) {
      // Fallback to generic API call if no specific implementation
      return this.genericApiCancellation(context);
    }

    try {
      // Use provider-specific implementation
      return await implementation.cancel(context);
    } catch (error) {
      console.error(`API cancellation failed for ${provider.name}:`, error);
      
      return {
        success: false,
        error: {
          code: "PROVIDER_ERROR",
          message: error instanceof Error ? error.message : "API cancellation failed",
          details: error,
        },
      };
    }
  }

  /**
   * Generic API cancellation for providers without specific implementation
   */
  private async genericApiCancellation(
    context: CancellationContext
  ): Promise<CancellationStrategyResult> {
    const { provider, subscription } = context;

    if (!provider?.apiEndpoint) {
      return {
        success: false,
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "No API endpoint configured for provider",
        },
      };
    }

    try {
      // Parse provider configuration
      const config: ApiProviderConfig = {
        endpoint: provider.apiEndpoint,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SubPilot/1.0",
        },
        timeout: 30000, // 30 seconds
      };

      // Make API request (mock for now)
      // In production, this would make actual HTTP requests
      console.log(`Making API request to ${config.endpoint}`);

      // Simulate API response
      const mockSuccess = Math.random() > 0.3; // 70% success rate

      if (mockSuccess) {
        const confirmationCode = `CNF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const effectiveDate = new Date();
        effectiveDate.setDate(effectiveDate.getDate() + 30); // Effective in 30 days

        return {
          success: true,
          confirmationCode,
          effectiveDate,
          refundAmount: Math.random() > 0.5 ? Number((subscription.amount * 0.5).toFixed(2)) : undefined,
        };
      } else {
        return {
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: "Cancellation request was rejected by the provider",
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Failed to connect to provider API",
          details: error,
        },
      };
    }
  }
}

// Base class for provider-specific implementations
export abstract class ApiProviderImplementation {
  abstract name: string;
  abstract cancel(context: CancellationContext): Promise<CancellationStrategyResult>;

  /**
   * Common HTTP request helper
   */
  protected async makeRequest(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Parse error response
   */
  protected parseErrorResponse(response: Response, body: any): {
    code: string;
    message: string;
    details?: any;
  } {
    if (response.status === 401) {
      return {
        code: "AUTH_FAILED",
        message: "Authentication failed",
      };
    } else if (response.status === 429) {
      return {
        code: "API_RATE_LIMIT",
        message: "Rate limit exceeded",
      };
    } else if (response.status >= 500) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        message: "Provider service is unavailable",
      };
    } else {
      return {
        code: "PROVIDER_ERROR",
        message: body?.error?.message || "Unknown provider error",
        details: body,
      };
    }
  }
}