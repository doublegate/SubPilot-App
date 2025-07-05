// Browser Console Debug Script
// Copy and paste this into the browser console to debug button rendering issues

console.log('🔍 Starting DOM Inspector...\n');

// 1. Find all buttons
const allButtons = document.querySelectorAll('button');
console.log(`Found ${allButtons.length} buttons in total\n`);

// 2. Analyze each button
allButtons.forEach((button, index) => {
  const rect = button.getBoundingClientRect();
  const styles = window.getComputedStyle(button);
  const isVisible =
    rect.width > 0 &&
    rect.height > 0 &&
    styles.display !== 'none' &&
    styles.visibility !== 'hidden';

  console.log(`Button #${index}:`);
  console.log(`  Text: "${button.textContent?.trim()}"`);
  console.log(`  Visible: ${isVisible}`);
  console.log(
    `  Position: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`
  );
  console.log(
    `  Styles: display=${styles.display}, visibility=${styles.visibility}, opacity=${styles.opacity}`
  );
  console.log(`  Z-Index: ${styles.zIndex}`);
  console.log(`  Pointer Events: ${styles.pointerEvents}`);
  console.log(`  Classes: ${button.className}`);

  // Check for event listeners
  const listeners = getEventListeners ? getEventListeners(button) : null;
  if (listeners && listeners.click) {
    console.log(`  Click listeners: ${listeners.click.length}`);
  }

  console.log('---');
});

// 3. Check for theme toggle specifically
console.log('\n🌓 Looking for theme toggle...');
const themeSelectors = [
  'button[aria-label*="theme"]',
  'button[data-testid*="theme"]',
  '.fixed.top-4.right-4 button',
  'button:has(svg)',
  'button:contains("🌙")',
  'button:contains("☀️")',
];

let themeToggleFound = false;
themeSelectors.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(
        `  Found ${elements.length} matches for selector: ${selector}`
      );
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        console.log(
          `    - ${el.textContent?.trim() || 'No text'} at (${rect.left}, ${rect.top})`
        );
      });
      themeToggleFound = true;
    }
  } catch (e) {
    // Ignore invalid selectors
  }
});

if (!themeToggleFound) {
  console.log('  ❌ No theme toggle found!');
}

// 4. Check for OAuth buttons
console.log('\n🔐 Looking for OAuth buttons...');
const oauthButtons = Array.from(allButtons).filter(
  btn =>
    btn.textContent?.includes('Google') || btn.textContent?.includes('GitHub')
);

if (oauthButtons.length > 0) {
  console.log(`  Found ${oauthButtons.length} OAuth buttons:`);
  oauthButtons.forEach(btn => {
    console.log(`    - "${btn.textContent?.trim()}"`);

    // Try clicking programmatically
    console.log(`      Testing click...`);
    btn.addEventListener(
      'click',
      () => console.log('      Click event fired!'),
      { once: true }
    );
    btn.click();
  });
} else {
  console.log('  ❌ No OAuth buttons found!');
}

// 5. Check for overlapping elements
console.log('\n📐 Checking for overlapping elements...');
const positions = [
  { x: window.innerWidth - 50, y: 50, name: 'Top right (theme toggle area)' },
  {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    name: 'Center (OAuth area)',
  },
];

positions.forEach(pos => {
  const elements = document.elementsFromPoint(pos.x, pos.y);
  console.log(`\n  At ${pos.name} (${pos.x}, ${pos.y}):`);
  elements.slice(0, 5).forEach((el, i) => {
    const styles = window.getComputedStyle(el);
    console.log(
      `    ${i}: ${el.tagName}.${el.className || 'no-class'} (z-index: ${styles.zIndex})`
    );
  });
});

// 6. React DevTools check
console.log('\n⚛️ Checking React components...');
const reactRoot =
  document.getElementById('__next') || document.querySelector('#root');
if (reactRoot) {
  const findReactFiber = element => {
    for (const key in element) {
      if (
        key.startsWith('__reactFiber') ||
        key.startsWith('__reactInternalInstance')
      ) {
        return element[key];
      }
    }
    return null;
  };

  const fiber = findReactFiber(reactRoot);
  if (fiber) {
    console.log('  ✅ React fiber found, app is running');
  } else {
    console.log('  ❌ No React fiber found');
  }
}

// 7. Create visual debug overlay
console.log('\n🎨 Creating visual debug overlay...');
allButtons.forEach((button, index) => {
  const rect = button.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = rect.top + 'px';
  overlay.style.left = rect.left + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  overlay.style.border = '2px solid red';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = `<span style="position: absolute; top: -20px; left: 0; background: red; color: white; padding: 2px 4px; font-size: 12px;">Button #${index}</span>`;
  document.body.appendChild(overlay);

  // Remove after 5 seconds
  setTimeout(() => overlay.remove(), 5000);
});

console.log(
  '\n✅ Debug complete! Red borders show all buttons (will disappear in 5 seconds)'
);
