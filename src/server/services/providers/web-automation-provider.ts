import { chromium, type Browser, type Page } from "playwright";
import type {
  CancellationProvider,
  CancellationContext,
  CancellationStrategyResult,
  WebAutomationConfig,
  NavigationStep,
} from "./types";

export class WebAutomationProvider implements CancellationProvider {
  name = "Web Automation Provider";
  type = "web_automation" as const;
  
  private browser: Browser | null = null;

  async cancel(context: CancellationContext): Promise<CancellationStrategyResult> {
    const { provider, subscription } = context;

    if (!provider || provider.type !== "web_automation") {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_OPERATION",
          message: "Provider does not support web automation",
        },
      };
    }

    const config = this.parseProviderConfig(provider);
    if (!config.loginUrl) {
      return {
        success: false,
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "No login URL configured for provider",
        },
      };
    }

    const screenshots: string[] = [];
    const automationLog: any[] = [];
    let page: Page | null = null;

    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless: true, // Set to false for debugging
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      page = await this.browser.newPage();
      
      // Set viewport and user agent
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.setExtraHTTPHeaders({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      });

      automationLog.push({
        step: "browser_launched",
        timestamp: new Date().toISOString(),
        message: "Browser launched successfully",
      });

      // Navigate to login page
      await page.goto(config.loginUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      automationLog.push({
        step: "navigation",
        timestamp: new Date().toISOString(),
        message: `Navigated to ${config.loginUrl}`,
      });

      // Take initial screenshot
      const screenshotPath = await this.takeScreenshot(page, "login_page");
      if (screenshotPath) screenshots.push(screenshotPath);

      // Execute navigation steps
      if (config.navigationSteps) {
        for (const step of config.navigationSteps) {
          const result = await this.executeNavigationStep(page, step, screenshots, automationLog);
          if (!result.success) {
            return {
              success: false,
              screenshots,
              automationLog,
              error: result.error,
            };
          }
        }
      }

      // Mock successful cancellation for now
      // In production, this would interact with actual websites
      const confirmationCode = `WEB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const effectiveDate = new Date();
      effectiveDate.setDate(effectiveDate.getDate() + 30);

      automationLog.push({
        step: "cancellation_completed",
        timestamp: new Date().toISOString(),
        message: "Cancellation completed successfully",
        confirmationCode,
      });

      // Take final screenshot
      const finalScreenshot = await this.takeScreenshot(page, "confirmation");
      if (finalScreenshot) screenshots.push(finalScreenshot);

      return {
        success: true,
        confirmationCode,
        effectiveDate,
        screenshots,
        automationLog,
      };
    } catch (error) {
      automationLog.push({
        step: "error",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Unknown error",
        error,
      });

      return {
        success: false,
        screenshots,
        automationLog,
        error: {
          code: "NAVIGATION_FAILED",
          message: error instanceof Error ? error.message : "Web automation failed",
          details: error,
        },
      };
    } finally {
      // Clean up
      if (page) await page.close();
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * Parse provider configuration into WebAutomationConfig
   */
  private parseProviderConfig(provider: any): WebAutomationConfig {
    const config: WebAutomationConfig = {
      loginUrl: provider.loginUrl || "",
      navigationSteps: [],
    };

    // Parse selectors
    if (provider.selectors) {
      const selectors = provider.selectors as any;
      config.usernameSelector = selectors.username;
      config.passwordSelector = selectors.password;
      config.submitSelector = selectors.submit;
    }

    // Parse automation script
    if (provider.automationScript?.steps) {
      config.navigationSteps = provider.automationScript.steps as NavigationStep[];
    }

    return config;
  }

  /**
   * Execute a single navigation step
   */
  private async executeNavigationStep(
    page: Page,
    step: NavigationStep,
    screenshots: string[],
    log: any[]
  ): Promise<{ success: boolean; error?: any }> {
    try {
      log.push({
        step: step.action,
        timestamp: new Date().toISOString(),
        message: `Executing ${step.action}`,
        selector: step.selector,
      });

      switch (step.action) {
        case "click":
          if (!step.selector) throw new Error("No selector provided for click action");
          await page.click(step.selector, { timeout: step.timeout || 10000 });
          break;

        case "fill":
          if (!step.selector || !step.value) {
            throw new Error("No selector or value provided for fill action");
          }
          await page.fill(step.selector, step.value, { timeout: step.timeout || 10000 });
          break;

        case "wait":
          await page.waitForTimeout(step.timeout || 1000);
          break;

        case "waitForSelector":
          if (!step.selector) throw new Error("No selector provided for waitForSelector");
          await page.waitForSelector(step.selector, { timeout: step.timeout || 30000 });
          break;

        case "screenshot":
          const screenshotPath = await this.takeScreenshot(
            page,
            step.description || "step_screenshot"
          );
          if (screenshotPath) screenshots.push(screenshotPath);
          break;

        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      return { success: true };
    } catch (error) {
      log.push({
        step: "error",
        timestamp: new Date().toISOString(),
        message: `Failed to execute ${step.action}`,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: {
          code: "ELEMENT_NOT_FOUND",
          message: `Failed to ${step.action} on ${step.selector}`,
          details: error,
        },
      };
    }
  }

  /**
   * Take a screenshot and return the path
   */
  private async takeScreenshot(page: Page, name: string): Promise<string | null> {
    try {
      // In production, this would save to a proper storage service
      // For now, we'll just return a mock path
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${name}_${timestamp}.png`;
      
      // Take actual screenshot (in memory for now)
      await page.screenshot({ fullPage: false });
      
      // Return mock S3/storage URL
      return `https://storage.subpilot.app/screenshots/${filename}`;
    } catch (error) {
      console.error("Failed to take screenshot:", error);
      return null;
    }
  }

  /**
   * Detect common anti-automation measures
   */
  private async detectAntiAutomation(page: Page): Promise<{
    detected: boolean;
    type?: string;
  }> {
    try {
      // Check for reCAPTCHA
      const recaptcha = await page.$('iframe[src*="recaptcha"]');
      if (recaptcha) {
        return { detected: true, type: "recaptcha" };
      }

      // Check for hCaptcha
      const hcaptcha = await page.$('iframe[src*="hcaptcha"]');
      if (hcaptcha) {
        return { detected: true, type: "hcaptcha" };
      }

      // Check for rate limiting messages
      const rateLimitText = await page.textContent("body");
      if (rateLimitText?.toLowerCase().includes("rate limit") || 
          rateLimitText?.toLowerCase().includes("too many requests")) {
        return { detected: true, type: "rate_limit" };
      }

      return { detected: false };
    } catch {
      return { detected: false };
    }
  }

  /**
   * Handle 2FA if detected
   */
  private async handle2FA(page: Page): Promise<{
    success: boolean;
    method?: string;
  }> {
    // This would implement 2FA handling logic
    // For now, return false to indicate manual intervention needed
    return { success: false };
  }
}