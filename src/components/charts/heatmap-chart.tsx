'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface HeatmapData {
  day: number;
  month: number;
  value: number;
  label?: string;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title?: string;
  description?: string;
  colorScheme?: 'green' | 'blue' | 'red';
  showLegend?: boolean;
}

export const HeatmapChart = React.memo(function HeatmapChart({
  data,
  title = 'Spending Heatmap',
  description,
  colorScheme = 'blue',
  showLegend = true,
}: HeatmapChartProps) {
  // Get color scale based on scheme
  const getColorScale = () => {
    switch (colorScheme) {
      case 'green':
        return ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a'];
      case 'red':
        return ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626'];
      case 'blue':
      default:
        return ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'];
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

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Group data by month
  const monthsData: Record<number, HeatmapData[]> = {};
  data.forEach(item => {
    if (!monthsData[item.month]) {
      monthsData[item.month] = [];
    }
    monthsData[item.month].push(item);
  });

  // Month names
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Day labels
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {dayLabels.map((day, index) => (
              <div key={index} className="h-5">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-2">
            {Object.entries(monthsData).map(([month, monthData]) => {
              // Create a 6x7 grid for the month
              const grid: (HeatmapData | null)[][] = Array(6).fill(null).map(() => Array(7).fill(null));
              
              // Get first day of month
              const firstDay = new Date(new Date().getFullYear(), parseInt(month), 1).getDay();
              
              // Fill the grid
              monthData.forEach(item => {
                const dayIndex = (item.day - 1 + firstDay) % 7;
                const weekIndex = Math.floor((item.day - 1 + firstDay) / 7);
                if (weekIndex < 6) {
                  grid[weekIndex][dayIndex] = item;
                }
              });

              return (
                <div key={month} className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {monthNames[parseInt(month)]}
                  </div>
                  <div className="space-y-1">
                    {grid.map((week, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-1">
                        {week.map((day, dayIndex) => (
                          <TooltipProvider key={dayIndex}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="aspect-square rounded-sm transition-all hover:ring-2 hover:ring-primary hover:ring-offset-1"
                                  style={{
                                    backgroundColor: day ? getColor(day.value) : 'transparent',
                                  }}
                                />
                              </TooltipTrigger>
                              {day && (
                                <TooltipContent>
                                  <div className="text-sm">
                                    <p className="font-medium">
                                      {monthNames[parseInt(month)]} {day.day}
                                    </p>
                                    <p>{formatCurrency(day.value)}</p>
                                    {day.label && <p className="text-xs text-muted-foreground">{day.label}</p>}
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
            })}
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
        </div>
      </CardContent>
    </Card>
  );
});