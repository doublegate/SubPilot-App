# SubPilot Accessibility Audit Report

## Overall Score: 0/100

### Summary
- **Total Files Audited**: 78
- **Files with Issues**: 37
- **Total Issues**: 91
  - **Errors**: 0
  - **Warnings**: 89
  - **Info**: 2

### Score Interpretation
- **90-100**: Excellent accessibility
- **80-89**: Good accessibility with minor issues
- **70-79**: Fair accessibility, needs improvement
- **60-69**: Poor accessibility, significant issues
- **Below 60**: Critical accessibility problems

## Issues by Category

- **Interactive Elements**: 0 errors, 0 warnings, 0 info
- **Keyboard Navigation**: 0 errors, 0 warnings, 1 info
- **Forms**: 0 errors, 0 warnings, 0 info
- **Structure**: 0 errors, 0 warnings, 0 info
- **Color Contrast**: 0 errors, 0 warnings, 1 info

## Detailed Issues


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/transaction-list.tsx:179
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/transaction-list.tsx:186
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/transaction-list.tsx:194
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Icon button may need screen reader text
- **File**: src/components/theme-toggle-standalone.tsx:23
- **Severity**: WARNING
- **Recommendation**: Add aria-label or <span className="sr-only">descriptive text</span> inside icon buttons
- **WCAG Guideline**: WCAG 2.1 AA - 4.1.2 Name, Role, Value


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/theme-toggle-standalone.tsx:24
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-notes.tsx:90
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-notes.tsx:113
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-notes.tsx:142
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-notes.tsx:178
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-notes.tsx:193
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-notes.tsx:219
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Keyboard Navigation - Custom keyboard handler detected
- **File**: src/components/subscription-notes.tsx:178
- **Severity**: INFO
- **Recommendation**: Ensure Enter and Space keys are handled for interactive elements
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-list.tsx:176
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-list.tsx:198
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-card.tsx:129
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-actions.tsx:79
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/subscription-actions.tsx:87
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/plaid-link-button.tsx:115
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/plaid-link-button.tsx:127
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/edit-subscription-modal.tsx:256
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Forms - Required field not properly indicated
- **File**: src/components/edit-subscription-modal.tsx:41
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/cancellation-assistant.tsx:384
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/cancellation-assistant.tsx:391
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/bank-connection-card.tsx:119
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth-form.tsx:101
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth-form.tsx:138
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth-form.tsx:151
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Forms - Required field not properly indicated
- **File**: src/components/auth-form.tsx:185
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/archive-subscription-modal.tsx:213
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/archive-subscription-modal.tsx:277
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Forms - Required field not properly indicated
- **File**: src/components/archive-subscription-modal.tsx:42
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/add-subscription-modal.tsx:390
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Forms - Required field not properly indicated
- **File**: src/components/add-subscription-modal.tsx:38
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Forms - Required field not properly indicated
- **File**: src/components/add-subscription-modal.tsx:41
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/account-list.tsx:82
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/profile/profile-form.tsx:113
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Structure - Page missing main landmark
- **File**: src/components/layout/nav-header.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/components/layout/nav-header-client.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth/sign-out-button.tsx:8
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth/login-form.tsx:46
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth/login-form.tsx:77
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/auth/login-form.tsx:149
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Forms - Required field not properly indicated
- **File**: src/components/auth/login-form.tsx:172
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Forms - Required field not properly indicated
- **File**: src/components/auth/login-form.tsx:250
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Forms - Required field not properly indicated
- **File**: src/components/auth/login-form.tsx:267
- **Severity**: WARNING
- **Recommendation**: Add aria-required="true" and visual indication
- **WCAG Guideline**: WCAG 2.1 AA - 3.3.2 Labels or Instructions


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/upcoming-renewals-calendar.tsx:188
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/upcoming-renewals-calendar.tsx:196
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/subscription-timeline.tsx:274
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/subscription-timeline.tsx:290
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/spending-trends-chart.tsx:112
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/spending-trends-chart.tsx:119
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/spending-trends-chart.tsx:129
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/spending-trends-chart.tsx:136
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/spending-trends-chart.tsx:143
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/category-breakdown-chart.tsx:152
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/category-breakdown-chart.tsx:159
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/category-breakdown-chart.tsx:170
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/category-breakdown-chart.tsx:177
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/analytics-filters.tsx:114
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/analytics-filters.tsx:134
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/analytics-filters.tsx:151
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/analytics-filters.tsx:168
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/analytics-filters.tsx:299
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/components/analytics/analytics-filters.tsx:317
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Structure - Heading hierarchy skips levels
- **File**: src/app/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Use consecutive heading levels (h1, h2, h3, etc.)
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Color Contrast - Very light text color detected
- **File**: src/app/page.tsx:12
- **Severity**: INFO
- **Recommendation**: Verify this text meets 4.5:1 contrast ratio, consider text-gray-500 or darker
- **WCAG Guideline**: WCAG 2.1 AA - 1.4.3 Contrast (Minimum)


### Structure - Page missing main landmark
- **File**: src/app/layout.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/verify-request/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Heading hierarchy skips levels
- **File**: src/app/banks/connect/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Use consecutive heading levels (h1, h2, h3, etc.)
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/banks/connect/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/auth-error/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/subscriptions/page.tsx:148
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Icon button may need screen reader text
- **File**: src/app/(dashboard)/subscriptions/page.tsx:233
- **Severity**: WARNING
- **Recommendation**: Add aria-label or <span className="sr-only">descriptive text</span> inside icon buttons
- **WCAG Guideline**: WCAG 2.1 AA - 4.1.2 Name, Role, Value


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/subscriptions/page.tsx:234
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/subscriptions/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/subscriptions/[id]/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Heading hierarchy skips levels
- **File**: src/app/(dashboard)/settings/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Use consecutive heading levels (h1, h2, h3, etc.)
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/settings/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/profile/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/notifications/page.tsx:71
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/notifications/page.tsx:119
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/notifications/page.tsx:130
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/notifications/page.tsx:152
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/notifications/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/dashboard/page.tsx:250
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/dashboard/page.tsx:271
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/dashboard/page.tsx:341
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/dashboard/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Interactive Elements - Click handler on non-interactive element
- **File**: src/app/(dashboard)/analytics/page.tsx:194
- **Severity**: WARNING
- **Recommendation**: Use button, link, or add proper role and keyboard support
- **WCAG Guideline**: WCAG 2.1 AA - 2.1.1 Keyboard


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/analytics/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


### Structure - Page missing main landmark
- **File**: src/app/(dashboard)/accounts/page.tsx:0
- **Severity**: WARNING
- **Recommendation**: Add <main> element or role="main" to identify main content
- **WCAG Guideline**: WCAG 2.1 AA - 1.3.1 Info and Relationships


## Quick Wins

Here are the easiest issues to fix first:



## Recommendations for Improvement

1. **Add missing alt text** for all images
2. **Implement proper form labels** for all input fields
3. **Ensure keyboard navigation** works for all interactive elements
4. **Verify color contrast** meets WCAG AA standards
5. **Add semantic landmarks** (main, nav, aside) to improve structure
6. **Test with screen readers** to validate real-world accessibility

## Tools for Ongoing Monitoring

- Use browser dev tools accessibility checker
- Install axe-core for automated testing
- Test with actual screen readers (NVDA, JAWS, VoiceOver)
- Consider using Lighthouse accessibility audits in CI/CD

---
*Generated on 2025-06-25T10:20:50.592Z*
