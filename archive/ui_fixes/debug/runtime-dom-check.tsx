'use client';

import { useEffect } from 'react';

export function RuntimeDOMCheck() {
  useEffect(() => {
    console.log('🔍 RuntimeDOMCheck: Starting DOM inspection...');

    const checkDOM = () => {
      const allButtons = document.querySelectorAll('button');
      console.log(`🔍 Total buttons in DOM: ${allButtons.length}`);

      allButtons.forEach((button, index) => {
        const rect = button.getBoundingClientRect();
        const styles = window.getComputedStyle(button);
        const text = button.textContent?.trim() || '';

        console.log(`🔍 Button #${index}: "${text}"`);
        console.log(
          `   Position: (${rect.left}, ${rect.top}) Size: ${rect.width}x${rect.height}`
        );
        console.log(`   Visible: ${rect.width > 0 && rect.height > 0}`);
        console.log(
          `   Display: ${styles.display}, Visibility: ${styles.visibility}`
        );
        console.log(
          `   Z-Index: ${styles.zIndex}, Pointer Events: ${styles.pointerEvents}`
        );

        // Add visual indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = `
          position: fixed;
          top: ${rect.top}px;
          left: ${rect.left}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          border: 2px solid red;
          background: rgba(255, 0, 0, 0.1);
          pointer-events: none;
          z-index: 99999;
        `;
        const label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          top: -20px;
          left: 0;
          background: red;
          color: white;
          padding: 2px 4px;
          font-size: 10px;
          font-family: monospace;
        `;
        label.textContent = `#${index}: ${text}`;
        indicator.appendChild(label);
        document.body.appendChild(indicator);

        // Remove after 10 seconds
        setTimeout(() => indicator.remove(), 10000);
      });

      // Check for theme toggle specifically
      const themeButton =
        document.querySelector('[aria-label*="theme"]') ||
        document.querySelector('[data-testid*="theme"]') ||
        document.querySelector('.fixed.top-4.right-4 button');

      console.log('🔍 Theme toggle found:', !!themeButton);

      // Check for OAuth buttons
      const oauthButtons = Array.from(allButtons).filter(
        btn =>
          btn.textContent?.includes('Google') ||
          btn.textContent?.includes('GitHub')
      );

      console.log(`🔍 OAuth buttons found: ${oauthButtons.length}`);

      // Check React fiber
      const checkReactFiber = (element: Element) => {
        for (const key in element) {
          if (key.startsWith('__reactFiber')) {
            return true;
          }
        }
        return false;
      };

      const reactButtons = Array.from(allButtons).filter(btn =>
        checkReactFiber(btn)
      );
      console.log(`🔍 Buttons with React fiber: ${reactButtons.length}`);

      // Create summary overlay
      const summary = document.createElement('div');
      summary.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: black;
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 99999;
        border-radius: 4px;
        max-width: 300px;
      `;
      summary.innerHTML = `
        <strong>DOM Debug Summary</strong><br>
        Total buttons: ${allButtons.length}<br>
        Theme toggle: ${themeButton ? '✓' : '✗'}<br>
        OAuth buttons: ${oauthButtons.length}<br>
        React buttons: ${reactButtons.length}<br>
        <br>
        <small>Red borders show button locations<br>
        This overlay will disappear in 10s</small>
      `;
      document.body.appendChild(summary);

      // Remove after 10 seconds
      setTimeout(() => summary.remove(), 10000);
    };

    // Check immediately
    checkDOM();

    // Check again after a delay
    setTimeout(checkDOM, 1000);
  }, []);

  return null;
}
