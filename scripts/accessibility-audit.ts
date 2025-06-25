#!/usr/bin/env tsx

/**
 * Accessibility Audit Script for SubPilot
 *
 * This script performs a comprehensive WCAG 2.1 AA compliance check
 * and generates a report with recommendations for improvements.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { globSync } from 'glob';

interface AccessibilityIssue {
  file: string;
  line: number;
  type: 'error' | 'warning' | 'info';
  category: string;
  issue: string;
  recommendation: string;
  wcagGuideline?: string;
}

interface AuditResults {
  issues: AccessibilityIssue[];
  stats: {
    totalFiles: number;
    filesWithIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  score: number; // 0-100 accessibility score
}

class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];
  private filesChecked = 0;

  async audit(): Promise<AuditResults> {
    console.log('🔍 Starting accessibility audit...\n');

    // Find all React component files
    const componentFiles = globSync('src/components/**/*.{tsx,jsx}', {
      cwd: process.cwd(),
    });

    const appFiles = globSync('src/app/**/*.{tsx,jsx}', {
      cwd: process.cwd(),
    });

    const allFiles = [...componentFiles, ...appFiles];

    for (const file of allFiles) {
      await this.auditFile(file);
    }

    const stats = this.calculateStats();
    const score = this.calculateScore(stats);

    return {
      issues: this.issues,
      stats,
      score,
    };
  }

  private async auditFile(filePath: string): Promise<void> {
    if (!existsSync(filePath)) return;

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    this.filesChecked++;

    console.log(`Auditing: ${filePath}`);

    // Check for various accessibility issues
    this.checkImages(filePath, lines);
    this.checkButtons(filePath, lines);
    this.checkForms(filePath, lines);
    this.checkHeadings(filePath, lines);
    this.checkColors(filePath, lines);
    this.checkKeyboardNavigation(filePath, lines);
    this.checkAriaLabels(filePath, lines);
    this.checkSemanticStructure(filePath, lines);
  }

  private checkImages(filePath: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for img tags without alt text
      if (line.includes('<img') && !line.includes('alt=')) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'error',
          category: 'Images',
          issue: 'Image missing alt attribute',
          recommendation: 'Add descriptive alt text for all images',
          wcagGuideline: 'WCAG 2.1 AA - 1.1.1 Non-text Content',
        });
      }

      // Check for empty alt text on decorative images
      if (line.includes('alt=""') && !line.includes('aria-hidden')) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'Images',
          issue: 'Decorative image should have aria-hidden="true"',
          recommendation:
            'Add aria-hidden="true" for decorative images with empty alt',
          wcagGuideline: 'WCAG 2.1 AA - 1.1.1 Non-text Content',
        });
      }
    });
  }

  private checkButtons(filePath: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for buttons without accessible names (but not Button components which handle this)
      if (
        line.includes('<button') &&
        !line.includes('aria-label') &&
        !line.includes('>') &&
        !line.includes('aria-labelledby')
      ) {
        // Check if button has text content in next few lines
        const hasTextContent = lines
          .slice(index, index + 3)
          .some(
            nextLine =>
              nextLine.trim() && !nextLine.includes('<') && nextLine.length > 2
          );

        if (!hasTextContent) {
          this.addIssue({
            file: filePath,
            line: index + 1,
            type: 'error',
            category: 'Interactive Elements',
            issue: 'Button missing accessible name',
            recommendation:
              'Add aria-label, aria-labelledby, or text content to buttons',
            wcagGuideline: 'WCAG 2.1 AA - 4.1.2 Name, Role, Value',
          });
        }
      }

      // Check for icon-only buttons that might need better labeling
      if (line.includes('size="icon"') && !line.includes('aria-label')) {
        // Look for screen reader text in nearby lines (more comprehensive check)
        const hasScreenReaderText = lines
          .slice(index, index + 5)
          .some(nextLine => nextLine.includes('sr-only'));

        if (!hasScreenReaderText) {
          this.addIssue({
            file: filePath,
            line: index + 1,
            type: 'warning',
            category: 'Interactive Elements',
            issue: 'Icon button may need screen reader text',
            recommendation:
              'Add aria-label or <span className="sr-only">descriptive text</span> inside icon buttons',
            wcagGuideline: 'WCAG 2.1 AA - 4.1.2 Name, Role, Value',
          });
        }
      }

      // Check for click handlers on non-interactive elements (with better UI library detection)
      const shadcnComponents = [
        'Button',
        'DropdownMenuItem',
        'MenuItem',
        'TabsTrigger',
        'AccordionTrigger',
        'SelectItem',
        'CommandItem',
        'Card',
        'Badge',
        'TableRow',
        'TableCell',
        'NavigationMenuItem',
        'ContextMenuItem',
        'AlertDialogTrigger',
        'DialogTrigger',
        'TooltipTrigger',
        'PopoverTrigger',
        'SheetTrigger',
        'CalendarDay',
      ];

      const isInteractiveComponent = shadcnComponents.some(
        component =>
          line.includes(`<${component}`) ||
          (line.includes(`${component}`) && line.includes('onClick'))
      );

      if (
        (line.includes('onClick') || line.includes('onKeyDown')) &&
        !line.includes('<button') &&
        !line.includes('<a') &&
        !line.includes('role=') &&
        !line.includes('<input') &&
        !isInteractiveComponent &&
        // Skip test files
        !filePath.includes('test.tsx') &&
        !filePath.includes('__tests__')
      ) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'Interactive Elements',
          issue: 'Click handler on non-interactive element',
          recommendation:
            'Use button, link, or add proper role and keyboard support',
          wcagGuideline: 'WCAG 2.1 AA - 2.1.1 Keyboard',
        });
      }
    });
  }

  private checkForms(filePath: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for inputs without labels (but skip base UI components)
      if (
        line.includes('<input') &&
        !line.includes('aria-label') &&
        !line.includes('aria-labelledby') &&
        !line.includes('type="hidden"') &&
        // Skip base UI component files - they're meant to be used with labels
        !filePath.includes('/ui/') &&
        !filePath.includes('/components/ui/')
      ) {
        // Check if there's a label in nearby lines (wider search)
        const hasLabel = lines
          .slice(Math.max(0, index - 5), index + 5)
          .some(
            nearLine =>
              nearLine.includes('<label') ||
              nearLine.includes('htmlFor') ||
              nearLine.includes('aria-label')
          );

        if (!hasLabel) {
          this.addIssue({
            file: filePath,
            line: index + 1,
            type: 'error',
            category: 'Forms',
            issue: 'Input field missing label',
            recommendation:
              'Associate input with label element or add aria-label',
            wcagGuideline: 'WCAG 2.1 AA - 3.3.2 Labels or Instructions',
          });
        }
      }

      // Check for required fields without indication (only for user-facing forms)
      if (
        line.includes('required') &&
        !line.includes('aria-required') &&
        !filePath.includes('/ui/') &&
        !filePath.includes('test.tsx') &&
        !filePath.includes('__tests__')
      ) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'Forms',
          issue: 'Required field not properly indicated',
          recommendation: 'Add aria-required="true" and visual indication',
          wcagGuideline: 'WCAG 2.1 AA - 3.3.2 Labels or Instructions',
        });
      }
    });
  }

  private checkHeadings(filePath: string, lines: string[]): void {
    const headingPattern = /<h[1-6]/g;
    const headings: number[] = [];

    lines.forEach((line: string, index: number) => {
      const matches = line.match(headingPattern);
      if (matches) {
        matches.forEach((match: string) => {
          const level = parseInt(match.charAt(2));
          headings.push(level);
        });
      }
    });

    // Check for heading hierarchy issues
    for (let i = 1; i < headings.length; i++) {
      if (headings[i]! > headings[i - 1]! + 1) {
        this.addIssue({
          file: filePath,
          line: 0, // Line number not available for this check
          type: 'warning',
          category: 'Structure',
          issue: 'Heading hierarchy skips levels',
          recommendation: 'Use consecutive heading levels (h1, h2, h3, etc.)',
          wcagGuideline: 'WCAG 2.1 AA - 1.3.1 Info and Relationships',
        });
        break;
      }
    }
  }

  private checkColors(filePath: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for potentially problematic color combinations
      const hasLightText =
        line.includes('text-gray-300') || line.includes('text-gray-400');
      const hasLightBackground =
        line.includes('bg-white') || line.includes('bg-gray-50');

      if (hasLightText && hasLightBackground) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'Color Contrast',
          issue:
            'Light text on light background may not meet contrast requirements',
          recommendation:
            'Use darker text colors (gray-600 or darker) on light backgrounds',
          wcagGuideline: 'WCAG 2.1 AA - 1.4.3 Contrast (Minimum)',
        });
      }

      // Check for very light gray text that's likely insufficient
      if (line.includes('text-gray-300') || line.includes('text-gray-200')) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'info',
          category: 'Color Contrast',
          issue: 'Very light text color detected',
          recommendation:
            'Verify this text meets 4.5:1 contrast ratio, consider text-gray-500 or darker',
          wcagGuideline: 'WCAG 2.1 AA - 1.4.3 Contrast (Minimum)',
        });
      }
    });
  }

  private checkKeyboardNavigation(filePath: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for focus management
      if (
        line.includes('tabIndex') &&
        line.includes('-1') &&
        !line.includes('aria-hidden')
      ) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'Keyboard Navigation',
          issue: 'Element removed from tab order',
          recommendation:
            'Ensure focus management is intentional and accessible',
          wcagGuideline: 'WCAG 2.1 AA - 2.1.1 Keyboard',
        });
      }

      // Check for custom keyboard handlers
      if (
        line.includes('onKeyDown') &&
        !line.includes('Enter') &&
        !line.includes('Space')
      ) {
        this.addIssue({
          file: filePath,
          line: index + 1,
          type: 'info',
          category: 'Keyboard Navigation',
          issue: 'Custom keyboard handler detected',
          recommendation:
            'Ensure Enter and Space keys are handled for interactive elements',
          wcagGuideline: 'WCAG 2.1 AA - 2.1.1 Keyboard',
        });
      }
    });
  }

  private checkAriaLabels(filePath: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for aria-labelledby references
      if (line.includes('aria-labelledby')) {
        const match = line.match(/aria-labelledby="([^"]+)"/);
        if (match) {
          const id = match[1];
          // Check if the referenced ID exists in the file
          const hasReferencedId = lines.some(otherLine =>
            otherLine.includes(`id="${id}"`)
          );

          if (!hasReferencedId) {
            this.addIssue({
              file: filePath,
              line: index + 1,
              type: 'error',
              category: 'ARIA',
              issue: `aria-labelledby references non-existent ID: ${id}`,
              recommendation:
                'Ensure aria-labelledby references valid element IDs',
              wcagGuideline: 'WCAG 2.1 AA - 4.1.2 Name, Role, Value',
            });
          }
        }
      }

      // Check for aria-describedby references
      if (line.includes('aria-describedby')) {
        const match = line.match(/aria-describedby="([^"]+)"/);
        if (match) {
          const id = match[1];
          const hasReferencedId = lines.some(otherLine =>
            otherLine.includes(`id="${id}"`)
          );

          if (!hasReferencedId) {
            this.addIssue({
              file: filePath,
              line: index + 1,
              type: 'error',
              category: 'ARIA',
              issue: `aria-describedby references non-existent ID: ${id}`,
              recommendation:
                'Ensure aria-describedby references valid element IDs',
              wcagGuideline: 'WCAG 2.1 AA - 4.1.2 Name, Role, Value',
            });
          }
        }
      }
    });
  }

  private checkSemanticStructure(filePath: string, lines: string[]): void {
    const content = lines.join('\n');

    // Check for proper landmarks
    const hasMain =
      content.includes('<main') || content.includes('role="main"');
    const hasNav =
      content.includes('<nav') || content.includes('role="navigation"');

    if (filePath.includes('layout') || filePath.includes('page')) {
      if (!hasMain) {
        this.addIssue({
          file: filePath,
          line: 0,
          type: 'warning',
          category: 'Structure',
          issue: 'Page missing main landmark',
          recommendation:
            'Add <main> element or role="main" to identify main content',
          wcagGuideline: 'WCAG 2.1 AA - 1.3.1 Info and Relationships',
        });
      }
    }

    // Check for list structure (improved detection)
    lines.forEach((line, index) => {
      if (line.includes('<li') && line.includes('>')) {
        // Look for list container in a wider range and check for proper nesting
        const hasListContainer = lines
          .slice(Math.max(0, index - 10), index + 1)
          .some(
            prevLine => prevLine.includes('<ul') || prevLine.includes('<ol')
          );

        // Also check if we're in a list context by looking at indentation/structure
        const currentIndent = line.search(/\S/);
        const hasProperNesting = lines
          .slice(Math.max(0, index - 10), index)
          .some(prevLine => {
            const prevIndent = prevLine.search(/\S/);
            return (
              (prevLine.includes('<ul') || prevLine.includes('<ol')) &&
              prevIndent < currentIndent
            );
          });

        if (!hasListContainer && !hasProperNesting) {
          this.addIssue({
            file: filePath,
            line: index + 1,
            type: 'error',
            category: 'Structure',
            issue: 'List item outside of list container',
            recommendation: 'Wrap <li> elements in <ul> or <ol>',
            wcagGuideline: 'WCAG 2.1 AA - 1.3.1 Info and Relationships',
          });
        }
      }
    });
  }

  private addIssue(issue: AccessibilityIssue): void {
    this.issues.push(issue);
  }

  private calculateStats() {
    const errorCount = this.issues.filter(i => i.type === 'error').length;
    const warningCount = this.issues.filter(i => i.type === 'warning').length;
    const infoCount = this.issues.filter(i => i.type === 'info').length;

    const filesWithIssues = new Set(this.issues.map(i => i.file)).size;

    return {
      totalFiles: this.filesChecked,
      filesWithIssues,
      errorCount,
      warningCount,
      infoCount,
    };
  }

  private calculateScore(stats: any): number {
    // Calculate score based on severity and file coverage
    const maxPenalty = 100;
    const errorPenalty = stats.errorCount * 5;
    const warningPenalty = stats.warningCount * 2;
    const infoPenalty = stats.infoCount * 0.5;

    const totalPenalty = Math.min(
      maxPenalty,
      errorPenalty + warningPenalty + infoPenalty
    );
    return Math.max(0, 100 - totalPenalty);
  }
}

async function generateReport(results: AuditResults): Promise<void> {
  const report = `# SubPilot Accessibility Audit Report

## Overall Score: ${results.score}/100

### Summary
- **Total Files Audited**: ${results.stats.totalFiles}
- **Files with Issues**: ${results.stats.filesWithIssues}
- **Total Issues**: ${results.issues.length}
  - **Errors**: ${results.stats.errorCount}
  - **Warnings**: ${results.stats.warningCount}
  - **Info**: ${results.stats.infoCount}

### Score Interpretation
- **90-100**: Excellent accessibility
- **80-89**: Good accessibility with minor issues
- **70-79**: Fair accessibility, needs improvement
- **60-69**: Poor accessibility, significant issues
- **Below 60**: Critical accessibility problems

## Issues by Category

${generateIssuesByCategory(results.issues)}

## Detailed Issues

${results.issues
  .map(
    issue => `
### ${issue.category} - ${issue.issue}
- **File**: ${issue.file}:${issue.line}
- **Severity**: ${issue.type.toUpperCase()}
- **Recommendation**: ${issue.recommendation}
${issue.wcagGuideline ? `- **WCAG Guideline**: ${issue.wcagGuideline}` : ''}
`
  )
  .join('\n')}

## Quick Wins

Here are the easiest issues to fix first:

${results.issues
  .filter(
    i =>
      i.type === 'error' &&
      (i.issue.includes('missing alt') ||
        i.issue.includes('missing label') ||
        i.issue.includes('missing accessible name'))
  )
  .slice(0, 10)
  .map(issue => `- ${issue.file}: ${issue.issue}`)
  .join('\n')}

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
*Generated on ${new Date().toISOString()}*
`;

  writeFileSync('accessibility-audit-report.md', report);
  console.log('\n📄 Report saved to: accessibility-audit-report.md');
}

function generateIssuesByCategory(issues: AccessibilityIssue[]): string {
  const categories = issues.reduce(
    (acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = { errors: 0, warnings: 0, info: 0 };
      }
      if (!acc[issue.category]) {
        acc[issue.category] = { errors: 0, warnings: 0, info: 0 };
      }
      acc[issue.category]![issue.type]++;
      return acc;
    },
    {} as Record<string, Record<string, number>>
  );

  return Object.entries(categories)
    .map(
      ([category, counts]) =>
        `- **${category}**: ${counts?.errors ?? 0} errors, ${counts?.warnings ?? 0} warnings, ${counts?.info ?? 0} info`
    )
    .join('\n');
}

// Run the audit
async function main() {
  try {
    const auditor = new AccessibilityAuditor();
    const results = await auditor.audit();

    console.log('\n🎯 Audit Complete!');
    console.log(`📊 Score: ${results.score}/100`);
    console.log(`📁 Files checked: ${results.stats.totalFiles}`);
    console.log(`🚨 Issues found: ${results.issues.length}`);
    console.log(`   - Errors: ${results.stats.errorCount}`);
    console.log(`   - Warnings: ${results.stats.warningCount}`);
    console.log(`   - Info: ${results.stats.infoCount}`);

    await generateReport(results);

    if (results.score >= 80) {
      console.log(
        '\n✅ Good accessibility score! Minor improvements recommended.'
      );
      process.exit(0);
    } else if (results.score >= 60) {
      console.log('\n⚠️  Fair accessibility. Several issues need attention.');
      process.exit(1);
    } else {
      console.log(
        '\n❌ Poor accessibility. Critical issues must be addressed.'
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
