declare module "@/env.js" {
  export const env: {
    NODE_ENV: "development" | "test" | "production";
    DATABASE_URL: string;
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    PLAID_CLIENT_ID?: string;
    PLAID_SECRET?: string;
    PLAID_ENV: "sandbox" | "development" | "production";
    PLAID_PRODUCTS: string;
    PLAID_COUNTRY_CODES: string;
    PLAID_REDIRECT_URI?: string;
    PLAID_WEBHOOK_URL?: string;
    SENDGRID_API_KEY?: string;
    FROM_EMAIL?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    OPENAI_API_KEY?: string;
    SENTRY_DSN?: string;
    REDIS_URL?: string;
    NEXT_PUBLIC_APP_URL?: string;
  };
}