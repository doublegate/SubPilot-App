import type {
  CancellationProvider,
  CancellationContext,
  CancellationStrategyResult,
  ManualInstructionSet,
  ManualInstruction,
} from "./types";

export class ManualCancellationProvider implements CancellationProvider {
  name = "Manual Cancellation Provider";
  type = "manual" as const;

  async cancel(context: CancellationContext): Promise<CancellationStrategyResult> {
    const { provider, subscription } = context;

    // Generate manual instructions
    const instructions = this.generateInstructions(provider, subscription);

    return {
      success: false, // Manual cancellations are never automatically successful
      manualInstructions: instructions,
      error: {
        code: "MANUAL_INTERVENTION_REQUIRED",
        message: "This subscription requires manual cancellation. Please follow the provided instructions.",
      },
    };
  }

  /**
   * Generate manual cancellation instructions
   */
  private generateInstructions(provider: any | null, subscription: any): ManualInstructionSet {
    // If we have provider-specific instructions, use them
    if (provider?.instructions && Array.isArray(provider.instructions)) {
      return this.parseProviderInstructions(provider, subscription);
    }

    // Otherwise, generate generic instructions
    return this.generateGenericInstructions(subscription);
  }

  /**
   * Parse provider-specific instructions
   */
  private parseProviderInstructions(provider: any, subscription: any): ManualInstructionSet {
    const instructions: ManualInstruction[] = provider.instructions.map((instr: any, index: number) => ({
      step: index + 1,
      title: instr.title || `Step ${index + 1}`,
      description: instr.description || "",
      warning: instr.warning,
      tip: instr.tip,
      expectedResult: instr.expectedResult,
    }));

    return {
      provider: provider.name,
      estimatedTime: provider.averageTime || 15,
      difficulty: provider.difficulty || "medium",
      prerequisites: this.getPrerequisites(provider),
      instructions,
      contactInfo: {
        phone: provider.phoneNumber,
        email: provider.email,
        chat: provider.chatUrl,
        hours: provider.hours || "24/7",
      },
      tips: this.getProviderTips(provider),
      commonIssues: this.getCommonIssues(provider),
    };
  }

  /**
   * Generate generic cancellation instructions
   */
  private generateGenericInstructions(subscription: any): ManualInstructionSet {
    const instructions: ManualInstruction[] = [
      {
        step: 1,
        title: "Locate your account information",
        description: "Gather your account details including username, email, and any account numbers associated with your subscription.",
        tip: "Check your email for recent invoices which often contain account information.",
      },
      {
        step: 2,
        title: "Visit the provider's website",
        description: `Go to ${subscription.name}'s official website and log in to your account.`,
        warning: "Make sure you're on the official website to avoid phishing attempts.",
      },
      {
        step: 3,
        title: "Navigate to account settings",
        description: "Look for 'Account', 'Settings', 'Billing', or 'Subscription' in the menu. This is typically found in the top-right corner after logging in.",
        tip: "If you can't find it, try searching for 'cancel subscription' in the help section.",
      },
      {
        step: 4,
        title: "Find cancellation option",
        description: "Look for options like 'Cancel Subscription', 'End Membership', or 'Turn off Auto-Renewal'.",
        warning: "Some providers hide this option. You may need to click through multiple pages.",
        alternativeMethod: {
          step: 4,
          title: "Contact customer support",
          description: "If you cannot find the cancellation option, use the contact information below to reach customer support directly.",
          tip: "Have your account information ready when contacting support.",
        },
      },
      {
        step: 5,
        title: "Complete cancellation process",
        description: "Follow the cancellation flow. You may be asked to provide a reason or offered incentives to stay.",
        warning: "Read carefully - some providers only offer to 'pause' rather than cancel.",
        tip: "Take screenshots of each step for your records.",
      },
      {
        step: 6,
        title: "Save confirmation",
        description: "Once cancelled, save or screenshot the confirmation page and any confirmation number provided.",
        expectedResult: "You should receive a confirmation number and/or email confirming your cancellation.",
        warning: "If you don't receive confirmation immediately, contact support to verify the cancellation.",
      },
    ];

    return {
      provider: subscription.name,
      estimatedTime: 15,
      difficulty: "medium",
      prerequisites: [
        "Account login credentials",
        "Access to the email associated with your account",
        "Payment method information (may be needed for verification)",
      ],
      instructions,
      contactInfo: {
        phone: "Check the provider's website for contact information",
        email: "Look for support@ or help@ email addresses",
        chat: "Many providers offer live chat on their website",
      },
      tips: [
        "Cancel at least 24-48 hours before your next billing date",
        "Take screenshots of every step in case you need proof later",
        "Check your bank statements to ensure billing stops",
        "Some subscriptions may continue until the end of the current billing period",
      ],
      commonIssues: [
        {
          issue: "Can't find cancellation option",
          solution: "Try searching 'cancel' in the help section or contact support directly",
        },
        {
          issue: "Website asks me to call",
          solution: "Some providers require phone cancellation. Call during business hours for shorter wait times",
        },
        {
          issue: "Offered a discount to stay",
          solution: "If you want to cancel, politely decline and proceed. If the offer is good, you can always resubscribe later",
        },
        {
          issue: "Cancellation not processed",
          solution: "Contact support with your confirmation number. If needed, dispute charges with your bank",
        },
      ],
    };
  }

  /**
   * Get prerequisites based on provider
   */
  private getPrerequisites(provider: any): string[] {
    const prerequisites = [
      "Account login credentials",
      "Access to the email associated with your account",
    ];

    if (provider.requires2FA) {
      prerequisites.push("Access to your two-factor authentication device");
    }

    if (provider.requiresAuth && provider.authType === "api_key") {
      prerequisites.push("API key or account token");
    }

    return prerequisites;
  }

  /**
   * Get provider-specific tips
   */
  private getProviderTips(provider: any): string[] {
    const tips = [
      "Cancel at least 24-48 hours before your next billing date",
      "Take screenshots of every step for your records",
    ];

    if (provider.requiresRetention) {
      tips.push("Be prepared to decline retention offers if you're sure about cancelling");
    }

    if (provider.supportsRefunds) {
      tips.push("Ask about refund eligibility for unused time");
    }

    return tips;
  }

  /**
   * Get common issues for provider
   */
  private getCommonIssues(provider: any): { issue: string; solution: string }[] {
    const issues = [
      {
        issue: "Can't find cancellation option",
        solution: "Contact support directly using the information provided",
      },
    ];

    if (provider.requires2FA) {
      issues.push({
        issue: "Two-factor authentication issues",
        solution: "Use backup codes or contact support for account recovery",
      });
    }

    if (provider.requiresRetention) {
      issues.push({
        issue: "Aggressive retention offers",
        solution: "Politely but firmly state you want to cancel. You can always resubscribe later if needed",
      });
    }

    return issues;
  }
}