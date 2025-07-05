#!/usr/bin/env node

/**
 * DOM Inspector Debug Script
 * This script inspects the DOM to debug theme toggle and OAuth button issues
 * Run with: npx tsx scripts/debug-dom-inspector.ts
 */

import puppeteer from 'puppeteer';

async function inspectDOM() {
  console.log('🔍 Starting DOM Inspector...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  page.on('error', err => {
    console.error('Browser error:', err);
  });
  
  page.on('pageerror', err => {
    console.error('Page error:', err);
  });
  
  console.log('📍 Navigating to localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Wait a bit for React to render
  await page.waitForTimeout(2000);
  
  console.log('\n🔎 Inspecting DOM Structure...\n');
  
  const domAnalysis = await page.evaluate(() => {
    const results: any = {
      buttons: [],
      themeToggle: null,
      oauthButtons: [],
      overlappingElements: [],
      reactComponents: [],
      errors: []
    };
    
    // 1. Find all buttons
    const allButtons = document.querySelectorAll('button');
    console.log(`Found ${allButtons.length} buttons in total`);
    
    allButtons.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      const styles = window.getComputedStyle(button);
      
      results.buttons.push({
        index,
        text: button.textContent?.trim() || '',
        className: button.className,
        id: button.id,
        visible: rect.width > 0 && rect.height > 0,
        position: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        computedStyles: {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          pointerEvents: styles.pointerEvents,
          position: styles.position
        },
        hasClickListener: button.onclick !== null || button.getAttribute('onclick') !== null,
        ariaLabel: button.getAttribute('aria-label'),
        innerHTML: button.innerHTML.substring(0, 100)
      });
    });
    
    // 2. Check for theme toggle specifically
    const themeToggleSelectors = [
      'button[aria-label*="theme"]',
      'button[class*="theme"]',
      'button:has(svg[class*="sun"])',
      'button:has(svg[class*="moon"])',
      '.absolute.right-4.top-4 button',
      '[class*="ThemeToggle"]'
    ];
    
    for (const selector of themeToggleSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          results.themeToggle = {
            found: true,
            selector,
            className: element.className,
            visible: rect.width > 0 && rect.height > 0,
            position: rect,
            parentElement: element.parentElement?.className
          };
          break;
        }
      } catch (e) {
        // Ignore selector errors
      }
    }
    
    // 3. Check for OAuth buttons
    const oauthSelectors = [
      'button[class*="google"]',
      'button[class*="github"]',
      'button:has(svg[class*="google"])',
      'button:has(svg[class*="github"])',
      'button:contains("Google")',
      'button:contains("GitHub")'
    ];
    
    oauthSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          results.oauthButtons.push({
            selector,
            text: el.textContent,
            visible: rect.width > 0 && rect.height > 0,
            position: rect
          });
        });
      } catch (e) {
        // Ignore selector errors
      }
    });
    
    // 4. Check for overlapping elements at common positions
    const positions = [
      { x: window.innerWidth - 50, y: 50 }, // Top right
      { x: window.innerWidth / 2, y: window.innerHeight / 2 } // Center
    ];
    
    positions.forEach(pos => {
      const elements = document.elementsFromPoint(pos.x, pos.y);
      if (elements.length > 1) {
        results.overlappingElements.push({
          position: pos,
          elements: elements.slice(0, 5).map(el => ({
            tagName: el.tagName,
            className: el.className,
            zIndex: window.getComputedStyle(el).zIndex
          }))
        });
      }
    });
    
    // 5. Check React Fiber
    const findReactFiber = (element: Element): any => {
      for (const key in element) {
        if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
          return (element as any)[key];
        }
      }
      return null;
    };
    
    allButtons.forEach(button => {
      const fiber = findReactFiber(button);
      if (fiber) {
        results.reactComponents.push({
          element: button.className,
          componentName: fiber.elementType?.name || fiber.type?.name || 'Unknown',
          props: fiber.memoizedProps
        });
      }
    });
    
    return results;
  });
  
  // Print analysis results
  console.log('📊 DOM Analysis Results:\n');
  console.log(`Total buttons found: ${domAnalysis.buttons.length}`);
  
  console.log('\n🔘 Button Details:');
  domAnalysis.buttons.forEach((button: any) => {
    console.log(`\n  Button #${button.index}:`);
    console.log(`    Text: "${button.text}"`);
    console.log(`    Class: ${button.className}`);
    console.log(`    Visible: ${button.visible}`);
    console.log(`    Position: ${JSON.stringify(button.position)}`);
    console.log(`    Display: ${button.computedStyles.display}`);
    console.log(`    Visibility: ${button.computedStyles.visibility}`);
    console.log(`    Opacity: ${button.computedStyles.opacity}`);
    console.log(`    Z-Index: ${button.computedStyles.zIndex}`);
    console.log(`    Pointer Events: ${button.computedStyles.pointerEvents}`);
    console.log(`    Has Click Listener: ${button.hasClickListener}`);
    if (button.innerHTML.includes('svg')) {
      console.log(`    Contains SVG: Yes`);
    }
  });
  
  console.log('\n🌓 Theme Toggle Search:');
  if (domAnalysis.themeToggle?.found) {
    console.log('  ✅ Theme toggle found!');
    console.log(`    Selector: ${domAnalysis.themeToggle.selector}`);
    console.log(`    Visible: ${domAnalysis.themeToggle.visible}`);
    console.log(`    Position: ${JSON.stringify(domAnalysis.themeToggle.position)}`);
  } else {
    console.log('  ❌ Theme toggle NOT found in DOM');
  }
  
  console.log('\n🔐 OAuth Buttons:');
  if (domAnalysis.oauthButtons.length > 0) {
    domAnalysis.oauthButtons.forEach((button: any) => {
      console.log(`  OAuth button: ${button.text}`);
      console.log(`    Visible: ${button.visible}`);
    });
  } else {
    console.log('  No OAuth buttons found');
  }
  
  console.log('\n📐 Overlapping Elements:');
  domAnalysis.overlappingElements.forEach((overlap: any) => {
    console.log(`  At position (${overlap.position.x}, ${overlap.position.y}):`);
    overlap.elements.forEach((el: any) => {
      console.log(`    - ${el.tagName} (z-index: ${el.zIndex})`);
    });
  });
  
  console.log('\n⚛️ React Components:');
  domAnalysis.reactComponents.forEach((comp: any) => {
    console.log(`  Component: ${comp.componentName}`);
    console.log(`    Element class: ${comp.element}`);
  });
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved as debug-screenshot.png');
  
  // Keep browser open for manual inspection
  console.log('\n🔧 Browser remains open for manual inspection. Press Ctrl+C to exit.');
}

inspectDOM().catch(console.error);