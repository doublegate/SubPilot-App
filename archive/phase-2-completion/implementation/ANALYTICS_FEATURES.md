# Analytics & Reporting Features

## Overview

SubPilot's Phase 2 Analytics & Reporting system provides comprehensive insights, predictive analytics, and optimization recommendations to help users manage their subscription spending effectively.

## Core Features

### 1. Analytics Engine (`analytics.service.ts`)

The analytics engine provides:

- **Time-Series Analysis**: Generate spending data grouped by day, week, or month
- **Predictive Analytics**: AI-powered spending predictions with confidence scores
- **Comparison Analysis**: Month-over-month, quarter-over-quarter, and year-over-year comparisons
- **Category Analysis**: Detailed breakdown by subscription categories with trends
- **Anomaly Detection**: Automatic detection of price spikes, duplicate charges, and unusual patterns
- **Cost Optimization**: Intelligent suggestions for reducing subscription costs

### 2. Data Visualization Components

#### Time Series Chart (`time-series-chart.tsx`)
- Interactive line/area charts with predictions
- Confidence intervals for forecasts
- Brush controls for zooming
- Trend indicators

#### Comparison Chart (`comparison-chart.tsx`)
- Side-by-side period comparisons
- Percentage change indicators
- Category-level breakdowns

#### Insights Card (`insights-card.tsx`)
- Prioritized recommendations
- Action buttons for quick fixes
- Severity indicators

#### Heatmap Chart (`heatmap-chart.tsx`)
- Daily spending patterns
- Calendar view of expenses
- Seasonal trend identification

### 3. Enhanced tRPC Endpoints

New analytics endpoints:

```typescript
// Get detailed category spending analysis
analytics.getCategoryBreakdown

// Compare spending periods
analytics.getComparisons

// Get AI predictions
analytics.getPredictions

// Detect spending anomalies
analytics.getAnomalies

// Get optimization suggestions
analytics.getOptimizations

// Generate comprehensive reports
analytics.generateReport

// Get custom time series data
analytics.getTimeSeries
```

### 4. Advanced Analytics Page

Located at `/analytics/advanced`, featuring:

- Predictive spending forecasts
- Period comparisons with visualizations
- AI-powered insights and recommendations
- Spending heatmaps
- Comprehensive report generation

### 5. Report Generation System

The `ReportViewer` component displays:

- Executive summary with key metrics
- Spending predictions for multiple horizons
- Category breakdowns with trends
- Anomaly alerts
- Optimization opportunities
- Export to PDF functionality

### 6. Background Analytics Jobs

The `AnalyticsJob` service provides:

- Scheduled analytics processing
- Cache warming for performance
- Anomaly detection notifications
- Daily report generation
- Prediction updates

## Performance Optimizations

### Database Indexes

Added indexes for optimal query performance:

```sql
-- Transaction indexes for time-based queries
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("bankAccountId", "date");
CREATE INDEX "Transaction_isSubscription_idx" ON "Transaction"("isSubscription");

-- Subscription indexes for analytics
CREATE INDEX "Subscription_userId_isActive_idx" ON "Subscription"("userId", "isActive");
CREATE INDEX "Subscription_userId_category_idx" ON "Subscription"("userId", "category");
```

### Caching Strategy

- In-memory caching for expensive calculations
- TTL-based cache invalidation
- Pre-computation of common queries
- Background cache warming

## Usage Examples

### 1. Generating Predictions

```typescript
const predictions = await analyticsService.predictFutureSpending(userId, 3);
// Returns: { predictedValue, confidence, trend, seasonalFactor }
```

### 2. Detecting Anomalies

```typescript
const anomalies = await analyticsService.detectAnomalies(userId);
// Returns array of anomalies with type, severity, and affected subscriptions
```

### 3. Getting Optimization Suggestions

```typescript
const suggestions = await analyticsService.generateOptimizationSuggestions(userId);
// Returns prioritized list of cost-saving opportunities
```

### 4. Generating Reports

```typescript
const report = await analyticsService.generateReport(userId, startDate, endDate);
// Returns comprehensive report with all analytics data
```

## Testing

Comprehensive test coverage includes:

- Unit tests for analytics calculations
- Integration tests for data aggregation
- Mock data for predictive algorithms
- Edge case handling

Run tests with:

```bash
npm test src/server/services/__tests__/analytics.service.test.ts
```

## Future Enhancements

- Machine learning model integration
- Peer comparison analytics
- Budget forecasting
- Subscription recommendation engine
- Natural language insights
- Real-time alerting system

## API Documentation

All analytics endpoints follow the tRPC pattern and include:

- Type-safe inputs and outputs
- Automatic error handling
- Authentication via protectedProcedure
- Response caching where appropriate

Example usage in React components:

```typescript
const { data: predictions } = api.analytics.getPredictions.useQuery({
  horizonMonths: 3
});

const { data: anomalies } = api.analytics.getAnomalies.useQuery();
```

## Accessibility

All visualization components include:

- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode compatibility
- Responsive design for all devices

## Security Considerations

- User data isolation via userId filtering
- No cross-user data leakage
- Encrypted sensitive information
- Rate limiting on expensive operations
- Input validation on all endpoints