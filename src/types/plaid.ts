/**
 * Type definitions for Plaid API responses
 * These types provide type safety for external API integration
 */

// Plaid Account Types
export interface PlaidAccount {
  account_id: string;
  balances: PlaidAccountBalance;
  mask: string | null;
  name: string;
  official_name: string | null;
  subtype: PlaidAccountSubtype | null;
  type: PlaidAccountType;
  verification_status?:
    | 'pending_automatic_verification'
    | 'pending_manual_verification'
    | 'manually_verified'
    | 'verification_expired'
    | 'verification_failed'
    | null;
}

export interface PlaidAccountBalance {
  available: number | null;
  current: number | null;
  iso_currency_code: string | null;
  limit: number | null;
  unofficial_currency_code: string | null;
}

export type PlaidAccountType =
  | 'investment'
  | 'credit'
  | 'depository'
  | 'loan'
  | 'brokerage'
  | 'other';

export type PlaidAccountSubtype =
  | 'checking'
  | 'savings'
  | 'hsa'
  | 'cd'
  | 'money market'
  | 'ira'
  | '401k'
  | 'student'
  | 'mortgage'
  | 'credit card';

// Plaid Transaction Types
export interface PlaidTransaction {
  account_id: string;
  account_owner: string | null;
  amount: number;
  iso_currency_code: string | null;
  unofficial_currency_code: string | null;
  category: string[] | null;
  category_id: string | null;
  check_number: string | null;
  counterparties: PlaidCounterparty[] | null;
  date: string;
  datetime: string | null;
  authorized_date: string | null;
  authorized_datetime: string | null;
  location: PlaidLocation | null;
  merchant_name: string | null;
  name: string;
  original_description: string | null;
  payment_channel: PlaidPaymentChannel;
  payment_meta: PlaidPaymentMeta;
  pending: boolean;
  pending_transaction_id: string | null;
  personal_finance_category: PlaidPersonalFinanceCategory | null;
  transaction_id: string;
  transaction_code: string | null;
  transaction_type: PlaidTransactionType | null;
}

export interface PlaidCounterparty {
  name: string;
  type:
    | 'merchant'
    | 'financial_institution'
    | 'payment_app'
    | 'marketplace'
    | 'payment_terminal'
    | 'other';
  logo_url: string | null;
  website: string | null;
  entity_id: string | null;
  confidence_level: 'very_high' | 'high' | 'medium' | 'low' | null;
}

export interface PlaidLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  store_number: string | null;
}

export type PlaidPaymentChannel = 'online' | 'in store' | 'other';

export interface PlaidPaymentMeta {
  by_order_of: string | null;
  payee: string | null;
  payer: string | null;
  payment_method: string | null;
  payment_processor: string | null;
  ppd_id: string | null;
  reason: string | null;
  reference_number: string | null;
}

export interface PlaidPersonalFinanceCategory {
  primary: string;
  detailed: string;
  confidence_level: 'very_high' | 'high' | 'medium' | 'low' | null;
}

export type PlaidTransactionType =
  | 'adjustment'
  | 'atm'
  | 'bank charge'
  | 'bill payment'
  | 'cash'
  | 'cashback'
  | 'cheque'
  | 'direct debit'
  | 'interest'
  | 'purchase'
  | 'standingorder'
  | 'transfer'
  | 'null';

// Plaid Institution Types
export interface PlaidInstitution {
  institution_id: string;
  name: string;
  products: PlaidProduct[];
  country_codes: string[];
  url: string | null;
  primary_color: string | null;
  logo: string | null;
  routing_numbers: string[];
  oauth: boolean;
  status: PlaidInstitutionStatus | null;
}

export type PlaidProduct =
  | 'assets'
  | 'auth'
  | 'identity'
  | 'investments'
  | 'liabilities'
  | 'payment_initiation'
  | 'transactions'
  | 'credit_details'
  | 'income'
  | 'income_verification'
  | 'deposit_switch'
  | 'standing_orders'
  | 'transfer'
  | 'employment'
  | 'recurring_transactions';

export interface PlaidInstitutionStatus {
  item_logins: PlaidStatusBreakdown;
  transactions_updates: PlaidStatusBreakdown;
  auth: PlaidStatusBreakdown;
  identity: PlaidStatusBreakdown;
  investments_updates: PlaidStatusBreakdown;
  liabilities_updates: PlaidStatusBreakdown;
  health_incidents: PlaidHealthIncident[] | null;
}

export interface PlaidStatusBreakdown {
  status: 'healthy' | 'degraded' | 'down';
  last_status_change: string;
  breakdown: Record<string, PlaidProductStatus>;
}

export interface PlaidProductStatus {
  status: 'healthy' | 'degraded' | 'down';
  last_status_change: string;
}

export interface PlaidHealthIncident {
  start_date: string;
  end_date: string | null;
  title: string;
  incident_updates: PlaidIncidentUpdate[];
}

export interface PlaidIncidentUpdate {
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  updated_date: string;
}

// Plaid Item Types
export interface PlaidItem {
  available_products: PlaidProduct[];
  billed_products: PlaidProduct[];
  consent_expiration_time: string | null;
  error: PlaidError | null;
  institution_id: string | null;
  item_id: string;
  update_type: 'background' | 'user_present_required';
  webhook: string | null;
}

// Plaid Error Types
export interface PlaidError {
  error_type: PlaidErrorType;
  error_code: string;
  error_message: string;
  display_message: string | null;
  request_id: string;
  causes: unknown[];
  status: number | null;
  documentation_url: string;
  suggested_action: string | null;
}

export type PlaidErrorType =
  | 'INVALID_REQUEST'
  | 'INVALID_RESULT'
  | 'INVALID_INPUT'
  | 'INSTITUTION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_ERROR'
  | 'ITEM_ERROR'
  | 'ASSET_REPORT_ERROR'
  | 'RECAPTCHA_ERROR'
  | 'OAUTH_ERROR'
  | 'PAYMENT_ERROR'
  | 'BANK_TRANSFER_ERROR'
  | 'INCOME_VERIFICATION_ERROR'
  | 'MICRODEPOSITS_ERROR'
  | 'SANDBOX_ERROR';

// Plaid Webhook Types
export interface PlaidWebhookTransaction {
  webhook_type: 'TRANSACTIONS';
  webhook_code:
    | 'SYNC_UPDATES_AVAILABLE'
    | 'DEFAULT_UPDATE'
    | 'HISTORICAL_UPDATE'
    | 'INITIAL_UPDATE'
    | 'TRANSACTIONS_REMOVED';
  item_id: string;
  error: PlaidError | null;
  new_transactions: number;
  environment: 'sandbox' | 'development' | 'production';
}

export interface PlaidWebhookItem {
  webhook_type: 'ITEM';
  webhook_code:
    | 'ERROR'
    | 'NEW_ACCOUNTS_AVAILABLE'
    | 'PENDING_EXPIRATION'
    | 'USER_PERMISSION_REVOKED'
    | 'WEBHOOK_UPDATE_ACKNOWLEDGED';
  item_id: string;
  error: PlaidError | null;
  environment: 'sandbox' | 'development' | 'production';
}

export type PlaidWebhook = PlaidWebhookTransaction | PlaidWebhookItem;

// Type guards for Plaid objects
export function isPlaidError(obj: unknown): obj is PlaidError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error_type' in obj &&
    'error_code' in obj
  );
}

export function isPlaidTransactionWebhook(
  obj: unknown
): obj is PlaidWebhookTransaction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'webhook_type' in obj &&
    obj.webhook_type === 'TRANSACTIONS'
  );
}

export function isPlaidItemWebhook(obj: unknown): obj is PlaidWebhookItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'webhook_type' in obj &&
    obj.webhook_type === 'ITEM'
  );
}

// Plaid API Response Types
export interface PlaidApiResponse<T = unknown> {
  data?: T;
  error?: PlaidError;
  request_id: string;
}

export interface PlaidTransactionsResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  total_transactions: number;
  item: PlaidItem;
  request_id: string;
}

export interface PlaidAccountsResponse {
  accounts: PlaidAccount[];
  item: PlaidItem;
  request_id: string;
}

export interface PlaidInstitutionsResponse {
  institutions: PlaidInstitution[];
  total: number;
  request_id: string;
}
