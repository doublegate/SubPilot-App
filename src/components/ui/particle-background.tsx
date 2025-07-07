'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from 'next-themes';

// Type declarations for p5.js
interface P5Instance {
  createCanvas: (width: number, height: number) => P5Canvas;
  windowWidth: number;
  windowHeight: number;
  width: number;
  height: number;
  random: (max: number) => number;
  randomSeed: (seed: number) => void;
  noiseSeed: (seed: number) => void;
  noise: (x: number, y: number, z: number) => number;
  stroke: (...args: number[]) => void;
  strokeWeight: (weight: number) => void;
  clear: () => void;
  background: (color: number, alpha?: number) => void;
  point: (x: number, y: number) => void;
  TAU: number;
  cos: (angle: number) => number;
  sin: (angle: number) => number;
  frameCount: number;
  resizeCanvas: (width: number, height: number) => void;
  noLoop: () => void;
  loop: () => void;
  remove: () => void;
  setup?: () => void;
  draw?: () => void;
  windowResized?: () => void;
}

interface P5Canvas {
  parent: (parent: HTMLElement | null) => void;
}

type P5Constructor = new (sketch: (p: P5Instance) => void) => P5Instance;

declare global {
  interface Window {
    p5?: P5Constructor;
  }
}

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  opacity?: number;
  useImageSeeding?: boolean; // Enable JSON-based seeding like Universal-Blue
  seedUrl?: string; // Custom seed URL
  stopOnScroll?: boolean; // Stop animation when scrolling past viewport
}

interface Particle {
  x: number;
  y: number;
}

interface ImageData {
  name: string;
  repository: {
    html_url: string;
  };
}

/**
 * ParticleBackground component that creates an animated particle effect
 * Uses p5.js for smooth animations and responds to theme changes
 * Incorporates features from Universal-Blue.org
 */
export default function ParticleBackground({
  className = '',
  particleCount = 500, // Increased to match Universal-Blue
  opacity = 0.4,
  useImageSeeding = false,
  seedUrl = 'https://universal-blue.org/image_list.json',
  stopOnScroll = true,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<P5Instance | null>(null);
  const isLoadedRef = useRef(false);
  const [p5Loaded, setP5Loaded] = useState(false);
  const [seedInfo, setSeedInfo] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const { theme } = useTheme();

  // Fetch JSON data for seeding
  const fetchSeedData = useCallback(async () => {
    if (!useImageSeeding) return;

    try {
      const response = await fetch(seedUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const jsonData = (await response.json()) as unknown[];
      if (jsonData && jsonData.length > 0) {
        // Filter non-private elements
        const nonPrivateElements = jsonData.filter(element => {
          const elem = element as { private?: boolean };
          return !elem.private;
        });
        if (nonPrivateElements.length === 0) return;

        // Random selection
        const randomIndex = Math.floor(
          Math.random() * nonPrivateElements.length
        );
        const selectedElement = nonPrivateElements[randomIndex];
        if (!Array.isArray(selectedElement)) return;

        const randomImage = Math.floor(Math.random() * selectedElement.length);
        const imageData = selectedElement[randomImage] as ImageData;

        // Calculate seed from name
        let seed = 0;
        for (let i = 0; i < imageData.name.length; i++) {
          seed += imageData.name.charCodeAt(i);
        }

        setSeedInfo({
          name: imageData.name,
          url: imageData.repository.html_url,
        });

        return seed;
      }
    } catch (error) {
      console.error('Error fetching seed data:', error);
    }

    return null;
  }, [useImageSeeding, seedUrl]);

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

  const initializeP5 = useCallback(async () => {
    if (!p5Loaded || !window.p5 || !canvasRef.current || p5InstanceRef.current)
      return;

    // Get seed value
    const seed = await fetchSeedData();

    // Store current theme for use in p5 sketch
    const currentTheme = theme;

    try {
      p5InstanceRef.current = new window.p5((p: P5Instance) => {
        const particles: Particle[] = [];
        const noiseScale = 0.01 / 9; // Matches Universal-Blue

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.parent(canvasRef.current);

          // Apply seeding if available
          if (seed !== null && seed !== undefined) {
            p.randomSeed(seed);
            p.noiseSeed(seed);
          }

          // Initialize particles
          for (let i = 0; i < particleCount; i++) {
            particles.push({
              x: p.random(p.width),
              y: p.random(p.height),
            });
          }

          // Theme-aware colors for better visibility on gradient backgrounds
          const strokeColor =
            currentTheme === 'dark' ? [255, 255, 255, 60] : [50, 50, 50, 80];
          p.stroke(...strokeColor);
          p.strokeWeight(1);
          p.clear();
        };

        p.draw = () => {
          // Stop animation when scrolled past viewport (like Universal-Blue)
          if (stopOnScroll && window.scrollY > window.innerHeight) {
            return;
          }

          // Theme-aware trailing effect
          const bgColor = currentTheme === 'dark' ? 0 : 255; // Black for dark mode, white for light mode
          const bgAlpha = currentTheme === 'dark' ? 10 : 15; // Adjust trail length based on theme
          p.background(bgColor, bgAlpha);

          for (const pt of particles) {
            // Bounds check
            if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number')
              continue;

            p.point(pt.x, pt.y);

            // Calculate movement using noise (exact formula from Universal-Blue)
            const n = p.noise(
              pt.x * noiseScale,
              pt.y * noiseScale,
              p.frameCount * noiseScale * noiseScale
            );
            const angle = p.TAU * n;

            pt.x += p.cos(angle);
            pt.y += p.sin(angle);

            // Respawn particles that go off-screen
            if (!onScreen(pt, p)) {
              pt.x = p.random(p.width);
              pt.y = p.random(p.height);
            }
          }
        };

        // Helper function to check if particle is on screen
        const onScreen = (v: Particle, p: P5Instance) => {
          return v.x >= 0 && v.x <= p.width && v.y >= 0 && v.y <= p.height;
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
  }, [theme, particleCount, fetchSeedData, p5Loaded, stopOnScroll]);

  // Check for reduced motion preference
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const handleMotionPreference = (
      e: MediaQueryListEvent | MediaQueryList
    ) => {
      if (e.matches && p5InstanceRef.current) {
        p5InstanceRef.current.noLoop();
      } else if (p5InstanceRef.current) {
        p5InstanceRef.current.loop();
      }
    };

    // Initial check
    handleMotionPreference(prefersReducedMotion);

    // Listen for changes
    prefersReducedMotion.addEventListener('change', handleMotionPreference);

    return () => {
      prefersReducedMotion.removeEventListener(
        'change',
        handleMotionPreference
      );
    };
  }, []);

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

  // Initialize p5.js once the script is loaded
  useEffect(() => {
    if (p5Loaded) {
      void initializeP5();
    }
  }, [p5Loaded, initializeP5]);

  // Reinitialize when theme changes
  useEffect(() => {
    if (p5Loaded && p5InstanceRef.current) {
      cleanupP5();
      const timeoutId = setTimeout(() => void initializeP5(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [theme, cleanupP5, initializeP5, p5Loaded]);

  return (
    <>
      <div
        ref={canvasRef}
        className={`pointer-events-none fixed inset-0 z-0 ${className}`}
        style={{ opacity }}
        aria-hidden="true"
        role="presentation"
      />

      {/* Optional: Show seed information like Universal-Blue */}
      {seedInfo && (
        <div className="fixed bottom-4 right-4 z-10 text-xs opacity-50">
          Seed:{' '}
          <a
            href={seedInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {seedInfo.name}
          </a>
        </div>
      )}
    </>
  );
}
