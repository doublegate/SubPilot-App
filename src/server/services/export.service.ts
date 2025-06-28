import { db } from '@/server/db';
import { format } from 'date-fns';
import type {} from '@prisma/client';

// CSV Export Types
export interface ExportOptions {
  userId: string;
  format: 'csv' | 'json' | 'pdf' | 'excel';
  includeTransactions?: boolean;
  includeAnalytics?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  subscriptionIds?: string[];
}

export interface ExportResult {
  filename: string;
  content: string | Buffer;
  mimeType: string;
}

export class ExportService {
  // Generate CSV Export
  static async generateCSV(options: ExportOptions): Promise<ExportResult> {
    const subscriptions = await db.subscription.findMany({
      where: {
        userId: options.userId,
        ...(options.subscriptionIds?.length && {
          id: { in: options.subscriptionIds },
        }),
      },
      include: {
        transactions: options.includeTransactions,
      },
    });

    const headers = [
      'Name',
      'Amount',
      'Currency',
      'Frequency',
      'Status',
      'Category',
      'Next Billing',
      'Start Date',
      'End Date',
      'Description',
    ];

    const rows = subscriptions.map(sub => [
      sub.name,
      sub.amount.toString(),
      sub.currency,
      sub.frequency,
      sub.isActive ? 'Active' : 'Inactive',
      sub.category ?? '',
      sub.nextBilling ? format(sub.nextBilling, 'yyyy-MM-dd') : '',
      sub.nextBilling ? format(sub.nextBilling, 'yyyy-MM-dd') : '',
      '',
      sub.description ?? '',
    ]);

    // Add transaction data if requested
    let transactionRows: string[][] = [];
    if (options.includeTransactions) {
      // Transaction headers would be added here if needed for formatting

      transactionRows = subscriptions.flatMap(
        sub =>
          sub.transactions?.map(trans => [
            sub.name,
            format(trans.date, 'yyyy-MM-dd'),
            trans.amount.toString(),
            trans.description ?? '',
          ]) ?? []
      );
    }

    // Combine all data
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...(transactionRows.length > 0
        ? [
            '',
            'Transaction History',
            ['Subscription', 'Date', 'Amount', 'Description'].join(','),
            ...transactionRows.map(row =>
              row.map(cell => `"${cell}"`).join(',')
            ),
          ]
        : []),
    ].join('\n');

    return {
      filename: `subscriptions_export_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      content: csvContent,
      mimeType: 'text/csv',
    };
  }

  // Generate JSON Export
  static async generateJSON(options: ExportOptions): Promise<ExportResult> {
    const data = await db.subscription.findMany({
      where: {
        userId: options.userId,
        ...(options.subscriptionIds?.length && {
          id: { in: options.subscriptionIds },
        }),
      },
      include: {
        transactions: options.includeTransactions,
      },
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      subscriptions: data.map(sub => ({
        id: sub.id,
        name: sub.name,
        amount: sub.amount,
        currency: sub.currency,
        frequency: sub.frequency,
        status: sub.isActive ? 'active' : 'inactive',
        category: sub.category,
        nextBilling: sub.nextBilling?.toISOString(),
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        description: sub.description,
        transactions: sub.transactions?.map(trans => ({
          date: trans.date.toISOString(),
          amount: trans.amount,
          description: trans.description,
        })),
      })),
    };

    if (options.includeAnalytics) {
      const analytics = await this.getAnalytics(options.userId);
      Object.assign(exportData, { analytics });
    }

    return {
      filename: `subscriptions_export_${format(new Date(), 'yyyy-MM-dd')}.json`,
      content: JSON.stringify(exportData, null, 2),
      mimeType: 'application/json',
    };
  }

  // Generate Excel Export (using CSV format for simplicity, can be enhanced with xlsx library)
  static async generateExcel(options: ExportOptions): Promise<ExportResult> {
    // For now, we'll generate a CSV that Excel can open
    // In production, you'd use a library like exceljs or xlsx
    const csvResult = await this.generateCSV(options);

    return {
      ...csvResult,
      filename: csvResult.filename.replace('.csv', '.xlsx'),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // Generate PDF Report (basic implementation, can be enhanced with React PDF)
  static async generatePDF(options: ExportOptions): Promise<ExportResult> {
    const subscriptions = await db.subscription.findMany({
      where: {
        userId: options.userId,
        ...(options.subscriptionIds?.length && {
          id: { in: options.subscriptionIds },
        }),
      },
    });

    const user = await db.user.findUnique({
      where: { id: options.userId },
    });

    // Basic HTML report that can be converted to PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SubPilot Subscription Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #06B6D4; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .summary { background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>SubPilot Subscription Report</h1>
        <p>Generated for: ${user?.email ?? 'Unknown'}</p>
        <p>Date: ${format(new Date(), 'MMMM dd, yyyy')}</p>
        
        <div class="summary">
          <h2>Summary</h2>
          <p>Total Subscriptions: ${subscriptions.length}</p>
          <p>Active Subscriptions: ${subscriptions.filter(s => s.isActive).length}</p>
          <p>Monthly Spend: $${subscriptions
            .filter(s => s.isActive && s.frequency === 'monthly')
            .reduce((sum, s) => sum + Number(s.amount), 0)
            .toFixed(2)}</p>
        </div>
        
        <h2>Subscription Details</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Frequency</th>
              <th>Status</th>
              <th>Next Billing</th>
            </tr>
          </thead>
          <tbody>
            ${subscriptions
              .map(
                sub => `
              <tr>
                <td>${sub.name}</td>
                <td>$${sub.amount.toFixed(2)}</td>
                <td>${sub.frequency}</td>
                <td>${sub.isActive ? 'Active' : 'Inactive'}</td>
                <td>${sub.nextBilling ? format(sub.nextBilling, 'MMM dd, yyyy') : '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return {
      filename: `subscriptions_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      content: htmlContent,
      mimeType: 'application/pdf',
    };
  }

  // Schedule Export (store in database for later processing)
  static async scheduleExport(
    userId: string,
    exportOptions: ExportOptions,
    scheduleDate: Date
  ) {
    // Store scheduled export in database
    // This would require a new table for scheduled exports
    return {
      id: crypto.randomUUID(),
      userId,
      options: exportOptions,
      scheduledFor: scheduleDate,
      status: 'pending',
    };
  }

  // Get export history
  static async getExportHistory(userId: string, _limit = 10) {
    // This would query the export history table
    // For now, returning mock data
    return [
      {
        id: '1',
        filename: 'subscriptions_export_2025-01-15.csv',
        format: 'csv',
        createdAt: new Date('2025-01-15'),
        size: '12.5 KB',
      },
    ];
  }

  // Helper: Get analytics data
  private static async getAnalytics(userId: string) {
    const subscriptions = await db.subscription.findMany({
      where: { userId, isActive: true },
    });

    const monthlySpend = subscriptions
      .filter(s => s.frequency === 'monthly')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const yearlySpend = subscriptions.reduce((sum, s) => {
      const multiplier =
        {
          monthly: 12,
          yearly: 1,
          weekly: 52,
          quarterly: 4,
        }[s.frequency] ?? 12;
      return sum + Number(s.amount) * multiplier;
    }, 0);

    const categoryBreakdown = subscriptions.reduce(
      (acc, sub) => {
        const category = sub.category ?? 'Uncategorized';
        acc[category] = (acc[category] ?? 0) + Number(sub.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalActive: subscriptions.length,
      monthlySpend,
      yearlySpend,
      categoryBreakdown,
    };
  }
}
