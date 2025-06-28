import { chromium, firefox, webkit, type Browser, type BrowserContext, type Page } from "playwright";
import { z } from "zod";

// Browser type enum
export const BrowserType = z.enum(["chromium", "firefox", "webkit"]);
export type BrowserType = z.infer<typeof BrowserType>;

// Automation step result
export interface AutomationStepResult {
  success: boolean;
  screenshot?: string;
  error?: string;
  duration?: number;
}

// Automation options
export interface AutomationOptions {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  recordVideo?: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export class AutomationService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Initialize browser with options
   */
  async initialize(
    browserType: BrowserType = "chromium",
    options: AutomationOptions = {}
  ): Promise<void> {
    try {
      // Select browser engine
      const browserEngine = {
        chromium,
        firefox,
        webkit,
      }[browserType];

      // Launch browser
      this.browser = await browserEngine.launch({
        headless: options.headless ?? true,
        proxy: options.proxy,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      // Create context with options
      this.context = await this.browser.newContext({
        viewport: options.viewport ?? { width: 1280, height: 720 },
        userAgent: options.userAgent ?? 
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        recordVideo: options.recordVideo ? { dir: "./recordings" } : undefined,
      });

      // Create page
      this.page = await this.context.newPage();

      // Set default timeout
      if (options.timeout) {
        this.page.setDefaultTimeout(options.timeout);
      }
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string, waitUntil: "load" | "domcontentloaded" | "networkidle" = "networkidle"): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    const startTime = Date.now();
    try {
      await this.page.goto(url, { waitUntil });
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Navigation failed",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Click an element
   */
  async click(selector: string, options?: { timeout?: number; force?: boolean }): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    const startTime = Date.now();
    try {
      await this.page.click(selector, options);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to click ${selector}: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fill a form field
   */
  async fill(selector: string, value: string, options?: { timeout?: number }): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    const startTime = Date.now();
    try {
      await this.page.fill(selector, value, options);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fill ${selector}: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Select from dropdown
   */
  async select(selector: string, value: string | string[], options?: { timeout?: number }): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    const startTime = Date.now();
    try {
      await this.page.selectOption(selector, value, options);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to select ${selector}: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector: string, options?: { timeout?: number; state?: "attached" | "detached" | "visible" | "hidden" }): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    const startTime = Date.now();
    try {
      await this.page.waitForSelector(selector, options);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Timeout waiting for ${selector}: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string, fullPage: boolean = false): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    try {
      // In production, this would upload to S3 or similar storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${name}_${timestamp}.png`;
      
      const buffer = await this.page.screenshot({ fullPage });
      
      // Mock S3 URL for now
      const screenshotUrl = `https://storage.subpilot.app/screenshots/${filename}`;
      
      return {
        success: true,
        screenshot: screenshotUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Screenshot failed",
      };
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(fn: () => T): Promise<T | null> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      return await this.page.evaluate(fn);
    } catch (error) {
      console.error("Evaluation error:", error);
      return null;
    }
  }

  /**
   * Handle dialog (alert, confirm, prompt)
   */
  async handleDialog(accept: boolean = true, promptText?: string): Promise<void> {
    if (!this.page) return;

    this.page.on("dialog", async (dialog) => {
      if (accept) {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get text content
   */
  async getText(selector: string): Promise<string | null> {
    if (!this.page) return null;

    try {
      return await this.page.textContent(selector);
    } catch {
      return null;
    }
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    if (!this.page) return null;

    try {
      return await this.page.getAttribute(selector, attribute);
    } catch {
      return null;
    }
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(options?: { url?: string | RegExp; waitUntil?: "load" | "domcontentloaded" | "networkidle" }): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    const startTime = Date.now();
    try {
      await this.page.waitForNavigation(options);
      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Navigation timeout",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Handle 2FA input
   */
  async handle2FA(selector: string, get2FACode: () => Promise<string>): Promise<AutomationStepResult> {
    if (!this.page) {
      return { success: false, error: "Browser not initialized" };
    }

    try {
      // Wait for 2FA input
      await this.page.waitForSelector(selector, { timeout: 30000 });
      
      // Get 2FA code (this would integrate with user's 2FA method)
      const code = await get2FACode();
      
      // Fill 2FA code
      await this.page.fill(selector, code);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `2FA handling failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Solve CAPTCHA (placeholder - would integrate with solving service)
   */
  async solveCaptcha(type: "recaptcha" | "hcaptcha" | "image"): Promise<AutomationStepResult> {
    // In production, this would integrate with a CAPTCHA solving service
    return {
      success: false,
      error: "CAPTCHA solving not implemented. Manual intervention required.",
    };
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string | null {
    return this.page ? this.page.url() : null;
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string | null> {
    return this.page ? await this.page.title() : null;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

// Export singleton instance
export const automationService = new AutomationService();