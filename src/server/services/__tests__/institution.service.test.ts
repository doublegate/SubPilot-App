import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InstitutionService } from '../institution.service';
import type { PlaidApi } from 'plaid';

// Create mock plaid client instance
const mockPlaidInstance = {
  institutionsGetById: vi.fn(),
  institutionsSearch: vi.fn(),
};

// Mock the plaid client
vi.mock('@/server/plaid-client', () => ({
  plaid: vi.fn(() => mockPlaidInstance),
  plaidWithRetry: vi.fn().mockImplementation(async operation => operation()),
}));

describe('InstitutionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache before each test
    InstitutionService.clearCache();
  });

  afterEach(() => {
    // Clear cache after each test to prevent interference
    InstitutionService.clearCache();
  });

  describe('getInstitution', () => {
    const mockInstitutionResponse = {
      data: {
        institution: {
          institution_id: 'ins_1',
          name: 'Test Bank',
          logo: 'https://example.com/logo.png',
          url: 'https://testbank.com',
          primary_color: '#1E88E5',
          oauth: false,
          mfa: ['sms', 'email'],
          status: {
            item_logins: {
              status: 'HEALTHY',
              last_status_change: '2024-01-01T00:00:00Z',
            },
            transactions_updates: {
              status: 'HEALTHY',
              last_status_change: '2024-01-01T00:00:00Z',
            },
            auth: {
              status: 'HEALTHY',
              last_status_change: '2024-01-01T00:00:00Z',
            },
            identity: {
              status: 'HEALTHY',
              last_status_change: '2024-01-01T00:00:00Z',
            },
          },
        },
      },
    };

    it('should fetch institution data successfully', async () => {
      mockPlaidInstance.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      const result = await InstitutionService.getInstitution('ins_1');

      expect(result).toEqual({
        id: 'ins_1',
        name: 'Test Bank',
        logo: 'https://example.com/logo.png',
        url: 'https://testbank.com',
        colors: {
          primary: '#1E88E5',
          darker: expect.stringMatching(/^#[0-9A-F]{6}$/i),
          lighter: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        },
        oauth: false,
        mfa: ['sms', 'email'],
        status: mockInstitutionResponse.data.institution.status,
      });

      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledWith({
        institution_id: 'ins_1',
        country_codes: ['US', 'CA'],
        options: {
          include_optional_metadata: true,
          include_status: true,
        },
      });
    });

    it('should handle institution without logo or colors', async () => {
      const minimalResponse = {
        data: {
          institution: {
            institution_id: 'ins_2',
            name: 'Minimal Bank',
            oauth: true,
            mfa: [],
            status: {
              item_logins: {
                status: 'HEALTHY',
                last_status_change: '2024-01-01T00:00:00Z',
              },
              transactions_updates: {
                status: 'HEALTHY',
                last_status_change: '2024-01-01T00:00:00Z',
              },
              auth: {
                status: 'HEALTHY',
                last_status_change: '2024-01-01T00:00:00Z',
              },
              identity: {
                status: 'HEALTHY',
                last_status_change: '2024-01-01T00:00:00Z',
              },
            },
          },
        },
      };

      mockPlaidInstance.institutionsGetById.mockResolvedValue(minimalResponse);

      const result = await InstitutionService.getInstitution('ins_2');

      expect(result).toEqual({
        id: 'ins_2',
        name: 'Minimal Bank',
        logo: undefined,
        url: undefined,
        colors: undefined,
        oauth: true,
        mfa: [],
        status: minimalResponse.data.institution.status,
      });
    });

    it('should cache institution data', async () => {
      mockPlaidInstance.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      // First call
      const result1 = await InstitutionService.getInstitution('ins_1');

      // Second call should use cache
      const result2 = await InstitutionService.getInstitution('ins_1');

      expect(result1).toEqual(result2);
      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after expiration', async () => {
      mockPlaidInstance.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      // Mock Date.now to simulate cache expiration
      const originalDateNow = Date.now;
      let currentTime = 1000000000000; // Start time
      Date.now = vi.fn().mockImplementation(() => currentTime);

      try {
        // First call
        await InstitutionService.getInstitution('ins_1');
        expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(1);

        // Advance time by 25 hours (past cache duration)
        currentTime += 25 * 60 * 60 * 1000;

        // Second call should fetch fresh data
        await InstitutionService.getInstitution('ins_1');
        expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should handle API errors gracefully', async () => {
      mockPlaidInstance.institutionsGetById.mockRejectedValue(
        new Error('API Error')
      );

      const result = await InstitutionService.getInstitution('ins_1');

      expect(result).toBeNull();
      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(1);
    });

    it('should return null when Plaid client is not configured', async () => {
      // Import the module to get the mocked function
      const plaidModule = await import('@/server/plaid-client');
      vi.mocked(plaidModule.plaid).mockReturnValue(null);

      const result = await InstitutionService.getInstitution('ins_1');

      expect(result).toBeNull();
      expect(mockPlaidInstance.institutionsGetById).not.toHaveBeenCalled();
    });
  });

  describe('getInstitutions', () => {
    it('should fetch multiple institutions in batches', async () => {
      const institutions = ['ins_1', 'ins_2', 'ins_3'];

      mockPlaidInstance.institutionsGetById = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            institution: {
              institution_id: 'ins_1',
              name: 'Bank 1',
              oauth: false,
              mfa: [],
              status: {},
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            institution: {
              institution_id: 'ins_2',
              name: 'Bank 2',
              oauth: true,
              mfa: ['sms'],
              status: {},
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            institution: {
              institution_id: 'ins_3',
              name: 'Bank 3',
              oauth: false,
              mfa: ['email'],
              status: {},
            },
          },
        });

      const result = await InstitutionService.getInstitutions(institutions);

      expect(result.size).toBe(3);
      expect(result.get('ins_1')?.name).toBe('Bank 1');
      expect(result.get('ins_2')?.name).toBe('Bank 2');
      expect(result.get('ins_3')?.name).toBe('Bank 3');

      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      const institutions = ['ins_1', 'ins_2'];

      mockPlaidInstance.institutionsGetById = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            institution: {
              institution_id: 'ins_1',
              name: 'Bank 1',
              oauth: false,
              mfa: [],
              status: {},
            },
          },
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await InstitutionService.getInstitutions(institutions);

      expect(result.size).toBe(1);
      expect(result.get('ins_1')?.name).toBe('Bank 1');
      expect(result.has('ins_2')).toBe(false);
    });

    it('should process large batches correctly', async () => {
      // Create 25 institution IDs to test batching (batch size is 10)
      const institutions = Array.from({ length: 25 }, (_, i) => `ins_${i + 1}`);

      // Mock responses for all institutions
      institutions.forEach((id, index) => {
        mockPlaidInstance.institutionsGetById.mockResolvedValue({
          data: {
            institution: {
              institution_id: id,
              name: `Bank ${index + 1}`,
              oauth: false,
              mfa: [],
              status: {},
            },
          },
        });
      });

      const result = await InstitutionService.getInstitutions(institutions);

      expect(result.size).toBeLessThanOrEqual(25); // Some might fail
      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalled();
    });
  });

  describe('searchInstitutions', () => {
    const mockSearchResponse = {
      data: {
        institutions: [
          {
            institution_id: 'ins_search_1',
            name: 'Search Bank 1',
            logo: 'https://example.com/search1.png',
            primary_color: '#FF5722',
            oauth: true,
            mfa: ['sms'],
            status: {},
          },
          {
            institution_id: 'ins_search_2',
            name: 'Search Bank 2',
            oauth: false,
            mfa: [],
            status: {},
          },
        ],
      },
    };

    it('should search institutions by query', async () => {
      mockPlaidInstance.institutionsSearch.mockResolvedValue(
        mockSearchResponse
      );

      const result = await InstitutionService.searchInstitutions('test bank');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'ins_search_1',
        name: 'Search Bank 1',
        logo: 'https://example.com/search1.png',
        url: undefined,
        colors: {
          primary: '#FF5722',
          darker: expect.stringMatching(/^#[0-9A-F]{6}$/i),
          lighter: expect.stringMatching(/^#[0-9A-F]{6}$/i),
        },
        oauth: true,
        mfa: ['sms'],
        status: {},
      });

      expect(mockPlaidInstance.institutionsSearch).toHaveBeenCalledWith({
        query: 'test bank',
        country_codes: ['US'],
        options: {
          include_optional_metadata: true,
        },
      });
    });

    it('should handle search with different country code', async () => {
      mockPlaidInstance.institutionsSearch.mockResolvedValue(
        mockSearchResponse
      );

      await InstitutionService.searchInstitutions('canadian bank', 'CA');

      expect(mockPlaidInstance.institutionsSearch).toHaveBeenCalledWith({
        query: 'canadian bank',
        country_codes: ['CA'],
        options: {
          include_optional_metadata: true,
        },
      });
    });

    it('should return empty array on search error', async () => {
      mockPlaidInstance.institutionsSearch.mockRejectedValue(
        new Error('Search failed')
      );

      const result =
        await InstitutionService.searchInstitutions('failing query');

      expect(result).toEqual([]);
    });

    it('should return empty array when Plaid client is not configured', async () => {
      // Import the module to get the mocked function
      const plaidModule = await import('@/server/plaid-client');
      vi.mocked(plaidModule.plaid).mockReturnValue(null);

      const result = await InstitutionService.searchInstitutions('test');

      expect(result).toEqual([]);
      expect(mockPlaidInstance.institutionsSearch).not.toHaveBeenCalled();
    });
  });

  describe('color utilities', () => {
    it('should darken colors correctly', async () => {
      const mockResponse = {
        data: {
          institution: {
            institution_id: 'ins_color',
            name: 'Color Bank',
            primary_color: '#1E88E5',
            oauth: false,
            mfa: [],
            status: {},
          },
        },
      };

      mockPlaidInstance.institutionsGetById.mockResolvedValue(mockResponse);

      const result = await InstitutionService.getInstitution('ins_color');

      expect(result?.colors?.primary).toBe('#1E88E5');
      expect(result?.colors?.darker).toMatch(/^#[0-9A-F]{6}$/i);
      expect(result?.colors?.lighter).toMatch(/^#[0-9A-F]{6}$/i);

      // Darker color should have lower RGB values
      expect(result?.colors?.darker).not.toBe('#1E88E5');
      expect(result?.colors?.lighter).not.toBe('#1E88E5');
    });

    it('should handle edge cases for color manipulation', async () => {
      const edgeCases = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'];

      for (const color of edgeCases) {
        const mockResponse = {
          data: {
            institution: {
              institution_id: 'ins_edge',
              name: 'Edge Bank',
              primary_color: color,
              oauth: false,
              mfa: [],
              status: {},
            },
          },
        };

        mockPlaidInstance.institutionsGetById.mockResolvedValue(mockResponse);

        const result = await InstitutionService.getInstitution('ins_edge');

        expect(result?.colors?.darker).toMatch(/^#[0-9A-F]{6}$/i);
        expect(result?.colors?.lighter).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });
  });

  describe('clearCache', () => {
    it('should clear the institution cache', async () => {
      const mockResponse = {
        data: {
          institution: {
            institution_id: 'ins_cache',
            name: 'Cache Bank',
            oauth: false,
            mfa: [],
            status: {},
          },
        },
      };

      mockPlaidInstance.institutionsGetById.mockResolvedValue(mockResponse);

      // First call
      await InstitutionService.getInstitution('ins_cache');
      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await InstitutionService.getInstitution('ins_cache');
      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(1);

      // Clear cache
      InstitutionService.clearCache();

      // Third call should fetch fresh data
      await InstitutionService.getInstitution('ins_cache');
      expect(mockPlaidInstance.institutionsGetById).toHaveBeenCalledTimes(2);
    });
  });
});
