'use client';

import { useState } from 'react';
import { FileDown, FileJson, FileText, FileSpreadsheet, Download, Calendar, Filter } from 'lucide-react';
import { ExportModal } from '@/components/export-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/trpc/react';
import { format } from 'date-fns';

export default function ExportPage() {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'pdf' | 'excel'>('csv');

  // Fetch export history
  const { data: exportHistory, isLoading } = api.export.getExportHistory.useQuery({
    limit: 10,
  });

  const exportCards = [
    {
      format: 'csv' as const,
      icon: FileText,
      title: 'CSV Export',
      description: 'Spreadsheet compatible format for Excel, Google Sheets',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      format: 'json' as const,
      icon: FileJson,
      title: 'JSON Export',
      description: 'Developer-friendly format with complete data structure',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      format: 'pdf' as const,
      icon: FileDown,
      title: 'PDF Report',
      description: 'Print-ready report with charts and summaries',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      format: 'excel' as const,
      icon: FileSpreadsheet,
      title: 'Excel Export',
      description: 'Full spreadsheet with multiple sheets and formatting',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  const handleExport = (format: typeof selectedFormat) => {
    setSelectedFormat(format);
    setExportModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Data</h1>
        <p className="text-muted-foreground">
          Download your subscription data in various formats
        </p>
      </div>

      {/* Export Options */}
      <div className="grid gap-4 md:grid-cols-2">
        {exportCards.map((card) => (
          <Card
            key={card.format}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => handleExport(card.format)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`rounded-lg p-3 ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="mt-4">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Actions</CardTitle>
          <CardDescription>
            Common export configurations for your convenience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              setSelectedFormat('csv');
              setExportModalOpen(true);
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Export This Month&apos;s Subscriptions
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              setSelectedFormat('pdf');
              setExportModalOpen(true);
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Export Active Subscriptions Report
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              setSelectedFormat('json');
              setExportModalOpen(true);
            }}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Export All Data with Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Your recent exports and downloads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : exportHistory?.exports && exportHistory.exports.length > 0 ? (
            <div className="space-y-2">
              {exportHistory.exports.map((export_) => (
                <div
                  key={export_.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <FileDown className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{export_.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(export_.createdAt), 'MMM dd, yyyy')} · {export_.size}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No export history yet. Create your first export above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </div>
  );
}