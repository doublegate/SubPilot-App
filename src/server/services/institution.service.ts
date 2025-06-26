import { plaid, plaidWithRetry } from '@/server/plaid-client';
import type { InstitutionsGetByIdRequest } from 'plaid';

export interface InstitutionData {
  id: string;
  name: string;
  logo?: string;
  url?: string;
  colors?: {
    primary?: string;
    darker?: string;
    lighter?: string;
  };
  oauth: boolean;
  mfa: string[];
  status: {
    item_logins: {
      status: string;
      last_status_change: string;
    };
    transactions_updates: {
      status: string;
      last_status_change: string;
    };
    auth: {
      status: string;
      last_status_change: string;
    };
    identity: {
      status: string;
      last_status_change: string;
    };
  };
}

/**
 * Institution service for managing bank institution data
 */
export class InstitutionService {
  private static institutionCache = new Map<string, InstitutionData>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static cacheTimestamp = new Map<string, number>();

  /**
   * Get institution details by ID
   */
  static async getInstitution(
    institutionId: string
  ): Promise<InstitutionData | null> {
    // Check cache first
    const cached = this.institutionCache.get(institutionId);
    const cacheTime = this.cacheTimestamp.get(institutionId) ?? 0;

    if (cached && Date.now() - cacheTime < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const client = plaid();
      if (!client) {
        console.warn('Plaid client not configured');
        return null;
      }

      const request: InstitutionsGetByIdRequest = {
        institution_id: institutionId,
        country_codes: ['US', 'CA'] as CountryCode[],
        options: {
          include_optional_metadata: true,
          include_status: true,
        },
      };

      const response = await plaidWithRetry(
        () => client.institutionsGetById(request),
        'institutionsGetById'
      );

      const institution = response.data.institution;

      const institutionData: InstitutionData = {
        id: institution.institution_id,
        name: institution.name,
        logo: institution.logo ?? undefined,
        url: institution.url ?? undefined,
        colors: institution.primary_color
          ? {
              primary: institution.primary_color,
              darker: this.darkenColor(institution.primary_color),
              lighter: this.lightenColor(institution.primary_color),
            }
          : undefined,
        oauth: institution.oauth,
        mfa: (institution as { mfa?: string[] }).mfa ?? [],
        status: institution.status ?? undefined,
      };

      // Cache the result
      this.institutionCache.set(institutionId, institutionData);
      this.cacheTimestamp.set(institutionId, Date.now());

      return institutionData;
    } catch (error) {
      console.error(
        `Failed to get institution details for ${institutionId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get multiple institutions
   */
  static async getInstitutions(
    institutionIds: string[]
  ): Promise<Map<string, InstitutionData>> {
    const results = new Map<string, InstitutionData>();

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < institutionIds.length; i += batchSize) {
      const batch = institutionIds.slice(i, i + batchSize);

      const promises = batch.map(async id => {
        const institution = await this.getInstitution(id);
        if (institution) {
          results.set(id, institution);
        }
      });

      await Promise.all(promises);

      // Rate limiting: wait between batches
      if (i + batchSize < institutionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Search institutions by name
   */
  static async searchInstitutions(
    query: string,
    countryCode = 'US'
  ): Promise<InstitutionData[]> {
    try {
      const client = plaid();
      if (!client) {
        console.warn('Plaid client not configured');
        return [];
      }

      const response = await plaidWithRetry(
        () =>
          client.institutionsSearch({
            query,
            country_codes: [countryCode as CountryCode],
            options: {
              include_optional_metadata: true,
            },
          }),
        'institutionsSearch'
      );

      return response.data.institutions.map(institution => ({
        id: institution.institution_id,
        name: institution.name,
        logo: institution.logo ?? undefined,
        url: institution.url ?? undefined,
        colors: institution.primary_color
          ? {
              primary: institution.primary_color,
              darker: this.darkenColor(institution.primary_color),
              lighter: this.lightenColor(institution.primary_color),
            }
          : undefined,
        oauth: institution.oauth,
        mfa: (institution as { mfa?: string[] }).mfa ?? [],
        status: institution.status,
      }));
    } catch (error) {
      console.error(
        `Failed to search institutions for query "${query}":`,
        error
      );
      return [];
    }
  }

  /**
   * Clear institution cache
   */
  static clearCache(): void {
    this.institutionCache.clear();
    this.cacheTimestamp.clear();
  }

  /**
   * Darken a hex color
   */
  private static darkenColor(hex: string, amount = 0.2): string {
    const color = hex.replace('#', '');
    const num = parseInt(color, 16);

    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Lighten a hex color
   */
  private static lightenColor(hex: string, amount = 0.2): string {
    const color = hex.replace('#', '');
    const num = parseInt(color, 16);

    const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * amount));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}
