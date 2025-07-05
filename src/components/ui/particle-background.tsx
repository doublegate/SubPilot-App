'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from 'next-themes';

// Type declarations for p5.js
declare global {
  interface Window {
    p5?: any;
  }
}

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  opacity?: number;
}

interface Particle {
  x: number;
  y: number;
}

/**
 * ParticleBackground component that creates an animated particle effect
 * Uses p5.js for smooth animations and responds to theme changes
 */
export default function ParticleBackground({
  className = '',
  particleCount = 150,
  opacity = 0.3,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);
  const isLoadedRef = useRef(false);
  const [p5Loaded, setP5Loaded] = useState(false);
  const { theme } = useTheme();

  const cleanupP5 = useCallback(() => {
    if (p5InstanceRef.current) {
      try {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up p5.js instance:', error);
      }
    }
  }, []);

  const initializeP5 = useCallback(() => {
    if (!p5Loaded || !window.p5 || !canvasRef.current || p5InstanceRef.current) return;

    try {
      p5InstanceRef.current = new window.p5((p: any) => {
        let particles: Particle[] = [];
        const noiseScale = 0.01 / 9;

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.parent(canvasRef.current);

          // Initialize particles
          for (let i = 0; i < particleCount; i++) {
            particles.push({
              x: p.random(p.width),
              y: p.random(p.height),
            });
          }

          // Set theme-aware colors
          const strokeColor = theme === 'dark' ? [255, 255, 255, 60] : [100, 100, 100, 80];
          p.stroke(...strokeColor);
          p.strokeWeight(1);
          p.clear();
        };

        p.draw = () => {
          // Theme-aware background
          const bgAlpha = theme === 'dark' ? 15 : 25;
          p.background(0, bgAlpha);

          for (let i = 0; i < particleCount; i++) {
            const pt = particles[i];

            // Bounds check with early return
            if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') continue;

            p.point(pt.x, pt.y);

            // Calculate movement using noise
            const n = p.noise(
              pt.x * noiseScale,
              pt.y * noiseScale,
              p.frameCount * noiseScale * noiseScale
            );
            const angle = p.TAU * n;

            pt.x += p.cos(angle);
            pt.y += p.sin(angle);

            // Wrap particles around screen edges
            if (pt.x < 0 || pt.x > p.width || pt.y < 0 || pt.y > p.height) {
              pt.x = p.random(p.width);
              pt.y = p.random(p.height);
            }
          }
        };

        p.windowResized = () => {
          try {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
          } catch (error) {
            console.warn('Error resizing canvas:', error);
          }
        };
      });
    } catch (error) {
      console.error('Error initializing p5.js:', error);
    }
  }, [theme, particleCount]);

  // Load p5.js script
  useEffect(() => {
    if (isLoadedRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      isLoadedRef.current = true;
      setP5Loaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load p5.js library');
    };

    document.head.appendChild(script);

    return () => {
      cleanupP5();
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [cleanupP5]);

  // Initialize p5.js once the script is loaded and component is mounted
  useEffect(() => {
    if (p5Loaded) {
      initializeP5();
    }
  }, [p5Loaded, initializeP5]);

  // Reinitialize when theme changes
  useEffect(() => {
    if (p5Loaded) {
      cleanupP5();
      // Small delay to ensure cleanup is complete
      const timeoutId = setTimeout(initializeP5, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [theme, cleanupP5, initializeP5]);

  return (
    <div
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
      role="presentation"
    />
  );
}
