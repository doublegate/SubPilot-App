'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface HeatmapData {
  day: number;
  month: number;
  value: number;
  label?: string;
  subscriptions?: string[];
}

interface HeatmapChartEnhancedProps {
  data: HeatmapData[];
  title?: string;
  description?: string;
  colorScheme?: 'green' | 'blue' | 'red';
  showLegend?: boolean;
}

export const HeatmapChartEnhanced = React.memo(function HeatmapChartEnhanced({
  data,
  title = 'Spending Heatmap',
  description,
  colorScheme = 'blue',
  showLegend = true,
}: HeatmapChartEnhancedProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    day: number;
    month: number;
    data: HeatmapData | null;
  } | null>(null);

  // Get color scale based on scheme
  const getColorScale = () => {
    switch (colorScheme) {
      case 'green':
        return [
          '#f0fdf4',
          '#bbf7d0',
          '#86efac',
          '#4ade80',
          '#22c55e',
          '#16a34a',
        ];
      case 'red':
        return [
          '#fef2f2',
          '#fecaca',
          '#fca5a5',
          '#f87171',
          '#ef4444',
          '#dc2626',
        ];
      case 'blue':
      default:
        return [
          '#eff6ff',
          '#bfdbfe',
          '#93c5fd',
          '#60a5fa',
          '#3b82f6',
          '#2563eb',
        ];
    }
  };

  const colors = getColorScale();

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => d.value), 1);

  // Get color for value
  const getColor = (value: number) => {
    if (value === 0) return '#f3f4f6';
    const index = Math.floor((value / maxValue) * (colors.length - 1));
    return colors[Math.min(index, colors.length - 1)] ?? '#f3f4f6';
  };

  // Group data by month
  const monthsData: Record<number, HeatmapData[]> = {};
  data.forEach(item => {
    monthsData[item.month] ??= [];
    monthsData[item.month]?.push(item);
  });

  // Month names
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const monthNamesShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  // Day labels
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Calculate month summary
  const getMonthSummary = (month: number) => {
    const monthData = monthsData[month] || [];
    const total = monthData.reduce((sum, day) => sum + day.value, 0);
    const average = monthData.length > 0 ? total / monthData.length : 0;
    const nonZeroDays = monthData.filter(day => day.value > 0).length;
    return { total, average, nonZeroDays, days: monthData.length };
  };

  // Render mini month view for year overview
  const renderMiniMonth = (month: number) => {
    const monthData = monthsData[month] || [];
    const summary = getMonthSummary(month);

    // Create a simple visualization - just show intensity
    const intensity = summary.total / maxValue;

    return (
      <TooltipProvider key={month}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              className="cursor-pointer transition-all hover:scale-105 hover:shadow-md"
              onClick={() => setSelectedMonth(month)}
            >
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">
                  {monthNamesShort[month]}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div
                  className="flex h-16 items-center justify-center rounded-md font-bold text-white"
                  style={{
                    backgroundColor: getColor(summary.total / 30), // Normalize by days
                    opacity: Math.max(0.3, intensity),
                  }}
                >
                  {formatCurrency(summary.total)}
                </div>
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {summary.nonZeroDays} active days
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">
                {monthNames[month]} {selectedYear}
              </p>
              <p>Total: {formatCurrency(summary.total)}</p>
              <p>Average/day: {formatCurrency(summary.average)}</p>
              <p>
                Active days: {summary.nonZeroDays}/{summary.days}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render full month view
  const renderFullMonth = (month: number) => {
    const monthData = monthsData[month] || [];
    const summary = getMonthSummary(month);

    // Create a 6x7 grid for the month
    const grid: (HeatmapData | null)[][] = Array(6)
      .fill(null)
      .map(() => Array(7).fill(null) as (HeatmapData | null)[]);

    // Get first day of month
    const firstDay = new Date(selectedYear, month, 1).getDay();
    const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();

    // Fill the grid
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = monthData.find(d => d.day === day);
      const dayIndex = (day - 1 + firstDay) % 7;
      const weekIndex = Math.floor((day - 1 + firstDay) / 7);
      if (weekIndex < 6) {
        grid[weekIndex]![dayIndex] = dayData || { day, month, value: 0 };
      }
    }

    return (
      <div className="space-y-4">
        {/* Month Header with Summary */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {monthNames[month]} {selectedYear}
            </h3>
            <div className="mt-1 text-sm text-muted-foreground">
              Total: {formatCurrency(summary.total)} • Average:{' '}
              {formatCurrency(summary.average)}/day • Active days:{' '}
              {summary.nonZeroDays}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMonth(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
          {dayLabels.map((day, index) => (
            <div key={index}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {grid.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIndex) => (
                <TooltipProvider key={dayIndex}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex aspect-square cursor-pointer items-center justify-center rounded-md text-sm transition-all ${
                          day && day.value > 0
                            ? 'hover:scale-110 hover:ring-2 hover:ring-primary hover:ring-offset-2'
                            : ''
                        } `}
                        style={{
                          backgroundColor: day
                            ? getColor(day.value)
                            : 'transparent',
                          color:
                            day && day.value > maxValue * 0.5
                              ? 'white'
                              : 'inherit',
                        }}
                        onClick={() => {
                          if (day && day.value > 0) {
                            setSelectedDay({ day: day.day, month, data: day });
                          }
                        }}
                      >
                        {day?.day}
                      </div>
                    </TooltipTrigger>
                    {day && day.value > 0 && (
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">
                            {monthNames[month]} {day.day}, {selectedYear}
                          </p>
                          <p>{formatCurrency(day.value)}</p>
                          {day.subscriptions &&
                            day.subscriptions.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {day.subscriptions.length} subscription
                                {day.subscriptions.length > 1 ? 's' : ''}
                              </p>
                            )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(selectedYear - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium">{selectedYear}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(selectedYear + 1)}
                disabled={selectedYear >= new Date().getFullYear()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedMonth === null ? (
              <>
                {/* Year Overview - 3x4 Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 12 }, (_, i) => renderMiniMonth(i))}
                </div>

                {/* Legend */}
                {showLegend && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground">Less</span>
                    <div className="flex gap-1">
                      <div className="h-3 w-3 rounded-sm bg-gray-100" />
                      {colors.map((color, index) => (
                        <div
                          key={index}
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">More</span>
                  </div>
                )}

                {/* Year Summary */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Spending
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            data.reduce((sum, d) => sum + d.value, 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Daily Average
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            data.length > 0
                              ? data.reduce((sum, d) => sum + d.value, 0) /
                                  data.length
                              : 0
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Most Expensive Day
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            Math.max(...data.map(d => d.value), 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Active Days
                        </p>
                        <p className="text-xl font-bold">
                          {data.filter(d => d.value > 0).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Full Month View */
              renderFullMonth(selectedMonth)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog
        open={selectedDay !== null}
        onOpenChange={open => !open && setSelectedDay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedDay && (
                  <>
                    {monthNames[selectedDay.month]} {selectedDay.day},{' '}
                    {selectedYear}
                  </>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              Daily subscription charges and renewals
            </DialogDescription>
          </DialogHeader>
          {selectedDay?.data && (
            <div className="space-y-4">
              <div className="py-4 text-center text-2xl font-bold">
                {formatCurrency(selectedDay.data.value)}
              </div>
              {selectedDay.data.subscriptions &&
                selectedDay.data.subscriptions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Subscriptions charged:</h4>
                    <ul className="space-y-1">
                      {selectedDay.data.subscriptions.map((sub, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {sub}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});
