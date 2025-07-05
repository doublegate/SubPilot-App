// Debug script to diagnose button issues
console.log('🔍 DEBUG: Starting button diagnosis...');

// Function to check element visibility and clickability
function checkElement(element, name) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const isVisible = rect.width > 0 && rect.height > 0 && 
                   styles.display !== 'none' && 
                   styles.visibility !== 'hidden' &&
                   styles.opacity !== '0';
  
  const elementAtPoint = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
  
  const isBlocked = elementAtPoint !== element && !element.contains(elementAtPoint);
  
  console.log(`🔍 ${name}:`, {
    found: true,
    visible: isVisible,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    styles: {
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      zIndex: styles.zIndex,
      position: styles.position
    },
    blocked: isBlocked,
    blockingElement: isBlocked ? elementAtPoint : null,
    disabled: element.disabled || element.hasAttribute('disabled')
  });
  
  // Add visual indicator
  element.style.border = '3px solid red';
  element.style.boxShadow = '0 0 10px red';
  
  return { element, isVisible, isBlocked };
}

// Check theme toggle
const themeToggle = document.querySelector('[aria-label="Toggle theme"]');
if (themeToggle) {
  const result = checkElement(themeToggle, 'Theme Toggle');
  
  // Try clicking it
  themeToggle.addEventListener('click', () => {
    console.log('🎯 Theme toggle clicked via debug!');
  });
} else {
  console.log('❌ Theme toggle not found in DOM');
}

// Check OAuth buttons
const buttons = document.querySelectorAll('button');
const oauthButtons = Array.from(buttons).filter(btn => 
  btn.textContent?.includes('Google') || btn.textContent?.includes('GitHub')
);

oauthButtons.forEach((btn, index) => {
  const provider = btn.textContent?.includes('Google') ? 'Google' : 'GitHub';
  const result = checkElement(btn, `OAuth ${provider}`);
  
  // Add click listener
  btn.addEventListener('click', (e) => {
    console.log(`🎯 ${provider} OAuth button clicked via debug!`, e);
    e.stopPropagation();
  });
  
  // Try force clicking
  setTimeout(() => {
    console.log(`🔧 Attempting force click on ${provider} button...`);
    btn.click();
  }, 2000 + (index * 1000));
});

// Check for overlaying elements
const allElements = document.querySelectorAll('*');
const overlays = Array.from(allElements).filter(el => {
  const styles = window.getComputedStyle(el);
  return styles.position === 'fixed' || styles.position === 'absolute';
});

console.log('🔍 Found overlay elements:', overlays.length);
overlays.forEach(el => {
  const rect = el.getBoundingClientRect();
  const styles = window.getComputedStyle(el);
  if (rect.width > 100 && rect.height > 100 && styles.zIndex && parseInt(styles.zIndex) > 10) {
    console.log('📍 Potential blocking overlay:', {
      element: el,
      class: el.className,
      zIndex: styles.zIndex,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    });
  }
});

// Check React fiber
const checkReactFiber = (element) => {
  const keys = Object.keys(element);
  const fiberKey = keys.find(key => key.startsWith('__reactFiber'));
  const propsKey = keys.find(key => key.startsWith('__reactProps'));
  
  if (fiberKey) {
    console.log('🎯 React Fiber found:', element[fiberKey]);
  }
  if (propsKey) {
    console.log('🎯 React Props found:', element[propsKey]);
  }
};

if (themeToggle) checkReactFiber(themeToggle);
oauthButtons.forEach(btn => checkReactFiber(btn));

console.log('🔍 DEBUG: Button diagnosis complete!');