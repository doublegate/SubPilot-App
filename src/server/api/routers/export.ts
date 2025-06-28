import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { ExportService } from '@/server/services/export.service';
import { TRPCError } from '@trpc/server';

const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf', 'excel']),
  includeTransactions: z.boolean().optional(),
  includeAnalytics: z.boolean().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  subscriptionIds: z.array(z.string()).optional(),
});

export const exportRouter = createTRPCRouter({
  generateCSV: protectedProcedure
    .input(exportOptionsSchema.omit({ format: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ExportService.generateCSV({
          userId: ctx.session.user.id,
          format: 'csv',
          ...input,
        });

        return {
          success: true,
          filename: result.filename,
          content: result.content,
          mimeType: result.mimeType,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate CSV export',
        });
      }
    }),

  generateJSON: protectedProcedure
    .input(exportOptionsSchema.omit({ format: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ExportService.generateJSON({
          userId: ctx.session.user.id,
          format: 'json',
          ...input,
        });

        return {
          success: true,
          filename: result.filename,
          content: result.content,
          mimeType: result.mimeType,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate JSON export',
        });
      }
    }),

  generatePDF: protectedProcedure
    .input(exportOptionsSchema.omit({ format: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ExportService.generatePDF({
          userId: ctx.session.user.id,
          format: 'pdf',
          ...input,
        });

        return {
          success: true,
          filename: result.filename,
          content: result.content,
          mimeType: result.mimeType,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate PDF report',
        });
      }
    }),

  generateExcel: protectedProcedure
    .input(exportOptionsSchema.omit({ format: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ExportService.generateExcel({
          userId: ctx.session.user.id,
          format: 'excel',
          ...input,
        });

        return {
          success: true,
          filename: result.filename,
          content: result.content,
          mimeType: result.mimeType,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate Excel export',
        });
      }
    }),

  scheduleExport: protectedProcedure
    .input(
      z.object({
        exportOptions: exportOptionsSchema,
        scheduleDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ExportService.scheduleExport(
          ctx.session.user.id,
          {
            userId: ctx.session.user.id,
            ...input.exportOptions,
          },
          input.scheduleDate
        );

        return {
          success: true,
          scheduledExport: result,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to schedule export',
        });
      }
    }),

  getExportHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const history = await ExportService.getExportHistory(
          ctx.session.user.id,
          input.limit
        );

        return {
          exports: history,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch export history',
        });
      }
    }),

  // Bulk export with all formats
  bulkExport: protectedProcedure
    .input(
      z.object({
        formats: z.array(z.enum(['csv', 'json', 'pdf', 'excel'])),
        includeTransactions: z.boolean().optional(),
        includeAnalytics: z.boolean().optional(),
        subscriptionIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const results = await Promise.all(
          input.formats.map(async (format) => {
            const exportOptions = {
              userId: ctx.session.user.id,
              format,
              includeTransactions: input.includeTransactions,
              includeAnalytics: input.includeAnalytics,
              subscriptionIds: input.subscriptionIds,
            };

            switch (format) {
              case 'csv':
                return await ExportService.generateCSV(exportOptions);
              case 'json':
                return await ExportService.generateJSON(exportOptions);
              case 'pdf':
                return await ExportService.generatePDF(exportOptions);
              case 'excel':
                return await ExportService.generateExcel(exportOptions);
            }
          })
        );

        return {
          success: true,
          exports: results,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate bulk exports',
        });
      }
    }),
});