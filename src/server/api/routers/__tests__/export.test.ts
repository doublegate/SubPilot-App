import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { exportRouter } from '../export';
import type { Session } from 'next-auth';

// Mock ExportService
const mockExportResult = {
  filename: 'subscriptions_export.csv',
  content: 'CSV content here',
  mimeType: 'text/csv',
};

const mockScheduledExport = {
  id: 'export_123',
  userId: 'user_123',
  status: 'scheduled',
  format: 'csv' as const,
  scheduledFor: new Date(),
  createdAt: new Date(),
};

const mockExportHistory = [
  {
    id: 'export_1',
    filename: 'export1.csv',
    status: 'completed',
    createdAt: new Date(),
  },
  {
    id: 'export_2',
    filename: 'export2.json',
    status: 'completed',
    createdAt: new Date(),
  },
];

vi.mock('@/server/services/export.service', () => ({
  ExportService: {
    generateCSV: vi.fn().mockResolvedValue(mockExportResult),
    generateJSON: vi.fn().mockResolvedValue({
      ...mockExportResult,
      filename: 'subscriptions_export.json',
      content: '{"data": "JSON content"}',
      mimeType: 'application/json',
    }),
    generatePDF: vi.fn().mockResolvedValue({
      ...mockExportResult,
      filename: 'subscriptions_export.pdf',
      content: Buffer.from('PDF content'),
      mimeType: 'application/pdf',
    }),
    generateExcel: vi.fn().mockResolvedValue({
      ...mockExportResult,
      filename: 'subscriptions_export.xlsx',
      content: Buffer.from('Excel content'),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    scheduleExport: vi.fn().mockResolvedValue(mockScheduledExport),
    getExportHistory: vi.fn().mockResolvedValue(mockExportHistory),
  },
}));

describe('exportRouter', () => {
  let mockCtx: {
    session: Session;
    db: any;
  };

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCtx = {
      session: {
        user: mockUser,
        expires: '2025-01-01',
      },
      db: {},
    };
  });

  describe('generateCSV', () => {
    it('should successfully generate CSV export', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.generateCSV({
        includeTransactions: true,
        includeAnalytics: false,
      });

      expect(result).toEqual({
        success: true,
        filename: 'subscriptions_export.csv',
        content: 'CSV content here',
        mimeType: 'text/csv',
      });
    });

    it('should handle CSV export service failure', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      vi.mocked(ExportService.generateCSV).mockRejectedValueOnce(
        new Error('Export failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(caller.generateCSV({})).rejects.toThrow(
        'Failed to generate CSV export'
      );
    });

    it('should pass correct parameters to ExportService', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      const caller = exportRouter.createCaller(mockCtx);

      const inputData = {
        includeTransactions: true,
        includeAnalytics: true,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
        subscriptionIds: ['sub_1', 'sub_2'],
      };

      await caller.generateCSV(inputData);

      expect(ExportService.generateCSV).toHaveBeenCalledWith({
        userId: 'user_123',
        format: 'csv',
        ...inputData,
      });
    });
  });

  describe('generateJSON', () => {
    it('should successfully generate JSON export', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.generateJSON({
        includeTransactions: false,
        includeAnalytics: true,
      });

      expect(result).toEqual({
        success: true,
        filename: 'subscriptions_export.json',
        content: '{"data": "JSON content"}',
        mimeType: 'application/json',
      });
    });

    it('should handle JSON export service failure', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      vi.mocked(ExportService.generateJSON).mockRejectedValueOnce(
        new Error('JSON export failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(caller.generateJSON({})).rejects.toThrow(
        'Failed to generate JSON export'
      );
    });
  });

  describe('generatePDF', () => {
    it('should successfully generate PDF export', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.generatePDF({});

      expect(result).toEqual({
        success: true,
        filename: 'subscriptions_export.pdf',
        content: Buffer.from('PDF content'),
        mimeType: 'application/pdf',
      });
    });

    it('should handle PDF export service failure', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      vi.mocked(ExportService.generatePDF).mockRejectedValueOnce(
        new Error('PDF generation failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(caller.generatePDF({})).rejects.toThrow(
        'Failed to generate PDF report'
      );
    });
  });

  describe('generateExcel', () => {
    it('should successfully generate Excel export', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.generateExcel({});

      expect(result).toEqual({
        success: true,
        filename: 'subscriptions_export.xlsx',
        content: Buffer.from('Excel content'),
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    });

    it('should handle Excel export service failure', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      vi.mocked(ExportService.generateExcel).mockRejectedValueOnce(
        new Error('Excel generation failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(caller.generateExcel({})).rejects.toThrow(
        'Failed to generate Excel export'
      );
    });
  });

  describe('scheduleExport', () => {
    it('should successfully schedule an export', async () => {
      const caller = exportRouter.createCaller(mockCtx);
      const scheduleDate = new Date('2025-01-15');

      const result = await caller.scheduleExport({
        exportOptions: {
          format: 'csv',
          includeTransactions: true,
        },
        scheduleDate,
      });

      expect(result).toEqual({
        success: true,
        scheduledExport: mockScheduledExport,
      });
    });

    it('should handle schedule export service failure', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      vi.mocked(ExportService.scheduleExport).mockRejectedValueOnce(
        new Error('Scheduling failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(
        caller.scheduleExport({
          exportOptions: { format: 'json' },
          scheduleDate: new Date(),
        })
      ).rejects.toThrow('Failed to schedule export');
    });

    it('should pass correct parameters to scheduleExport', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      const caller = exportRouter.createCaller(mockCtx);
      const scheduleDate = new Date('2025-01-15');

      await caller.scheduleExport({
        exportOptions: {
          format: 'pdf',
          includeAnalytics: true,
        },
        scheduleDate,
      });

      expect(ExportService.scheduleExport).toHaveBeenCalledWith(
        'user_123',
        {
          userId: 'user_123',
          format: 'pdf',
          includeAnalytics: true,
        },
        scheduleDate
      );
    });
  });

  describe('getExportHistory', () => {
    it('should successfully get export history with default limit', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.getExportHistory({});

      expect(result).toEqual({
        exports: mockExportHistory,
      });
    });

    it('should get export history with custom limit', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      const caller = exportRouter.createCaller(mockCtx);

      await caller.getExportHistory({ limit: 25 });

      expect(ExportService.getExportHistory).toHaveBeenCalledWith(
        'user_123',
        25
      );
    });

    it('should handle export history service failure', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      vi.mocked(ExportService.getExportHistory).mockRejectedValueOnce(
        new Error('History fetch failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(caller.getExportHistory({})).rejects.toThrow(
        'Failed to fetch export history'
      );
    });

    it('should validate limit parameter bounds', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      // Test minimum bound
      await expect(caller.getExportHistory({ limit: 0 })).rejects.toThrow();

      // Test maximum bound
      await expect(caller.getExportHistory({ limit: 51 })).rejects.toThrow();
    });
  });

  describe('bulkExport', () => {
    it('should successfully generate bulk exports for multiple formats', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.bulkExport({
        formats: ['csv', 'json'],
        includeTransactions: true,
      });

      expect(result.success).toBe(true);
      expect(result.exports).toHaveLength(2);
    });

    it('should handle partial failures in bulk export', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );

      // Mock CSV to succeed but JSON to fail
      vi.mocked(ExportService.generateCSV).mockResolvedValueOnce(
        mockExportResult
      );
      vi.mocked(ExportService.generateJSON).mockRejectedValueOnce(
        new Error('JSON failed')
      );

      const caller = exportRouter.createCaller(mockCtx);

      await expect(
        caller.bulkExport({
          formats: ['csv', 'json'],
        })
      ).rejects.toThrow('Failed to generate bulk exports');
    });

    it('should call appropriate export methods for each format', async () => {
      const { ExportService } = await import(
        '@/server/services/export.service'
      );
      const caller = exportRouter.createCaller(mockCtx);

      await caller.bulkExport({
        formats: ['csv', 'pdf', 'excel'],
        includeAnalytics: true,
        subscriptionIds: ['sub_1'],
      });

      expect(ExportService.generateCSV).toHaveBeenCalledWith({
        userId: 'user_123',
        format: 'csv',
        includeAnalytics: true,
        subscriptionIds: ['sub_1'],
      });

      expect(ExportService.generatePDF).toHaveBeenCalledWith({
        userId: 'user_123',
        format: 'pdf',
        includeAnalytics: true,
        subscriptionIds: ['sub_1'],
      });

      expect(ExportService.generateExcel).toHaveBeenCalledWith({
        userId: 'user_123',
        format: 'excel',
        includeAnalytics: true,
        subscriptionIds: ['sub_1'],
      });
    });

    it('should handle empty formats array', async () => {
      const caller = exportRouter.createCaller(mockCtx);

      const result = await caller.bulkExport({
        formats: [],
      });

      expect(result.success).toBe(true);
      expect(result.exports).toHaveLength(0);
    });
  });
});
