'use client';

import { useState } from 'react';
import { FileDown, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubscriptionIds?: string[];
}

type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel';

const formatOptions = [
  {
    value: 'csv',
    label: 'CSV',
    icon: FileText,
    description: 'Spreadsheet compatible',
  },
  {
    value: 'json',
    label: 'JSON',
    icon: FileJson,
    description: 'Developer friendly',
  },
  {
    value: 'pdf',
    label: 'PDF',
    icon: FileDown,
    description: 'Print ready report',
  },
  {
    value: 'excel',
    label: 'Excel',
    icon: FileSpreadsheet,
    description: 'Full spreadsheet',
  },
] as const;

export function ExportModal({
  open,
  onOpenChange,
  selectedSubscriptionIds,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [includeAnalytics, setIncludeAnalytics] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const exportMutation = api.export[
    format === 'csv'
      ? 'generateCSV'
      : format === 'json'
        ? 'generateJSON'
        : format === 'pdf'
          ? 'generatePDF'
          : 'generateExcel'
  ].useMutation({
    onSuccess: data => {
      // Create download link
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Export downloaded: ${data.filename}`);
      onOpenChange(false);
    },
    onError: error => {
      toast.error('Export failed: ' + error.message);
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      includeTransactions,
      includeAnalytics,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      subscriptionIds: selectedSubscriptionIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Subscriptions</DialogTitle>
          <DialogDescription>
            Download your subscription data in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={v => setFormat(v as ExportFormat)}
            >
              <div className="grid grid-cols-2 gap-3">
                {formatOptions.map(option => (
                  <label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted ${
                      format === option.value
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="sr-only"
                    />
                    <option.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Include in Export</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="transactions"
                checked={includeTransactions}
                onCheckedChange={checked => setIncludeTransactions(!!checked)}
              />
              <label
                htmlFor="transactions"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Transaction History
              </label>
            </div>

            {format === 'json' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="analytics"
                  checked={includeAnalytics}
                  onCheckedChange={checked => setIncludeAnalytics(!!checked)}
                />
                <label
                  htmlFor="analytics"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Analytics Data
                </label>
              </div>
            )}
          </div>

          {/* Date Range */}
          {includeTransactions && (
            <div className="space-y-3">
              <Label>Transaction Date Range (Optional)</Label>
              <CalendarDateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              Exporting {selectedSubscriptionIds?.length || 'all'} subscription
              {!selectedSubscriptionIds?.length ||
              selectedSubscriptionIds.length > 1
                ? 's'
                : ''}{' '}
              as {format.toUpperCase()}
              {includeTransactions && ' with transaction history'}
              {includeAnalytics && ' and analytics data'}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
