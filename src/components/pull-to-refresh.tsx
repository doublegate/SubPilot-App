'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let currentIsPulling = false;
    let currentPullDistance = 0;
    let currentIsRefreshing = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        touchStartY = e.touches[0]?.clientY ?? 0;
        startY.current = touchStartY;
        currentIsPulling = true;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!currentIsPulling || currentIsRefreshing) return;

      const touchY = e.touches[0]?.clientY ?? 0;
      const distance = touchY - startY.current;

      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        // Apply resistance for more natural feel
        const adjustedDistance = Math.min(distance * 0.5, threshold * 2);
        currentPullDistance = adjustedDistance;
        setPullDistance(adjustedDistance);
      }
    };

    const handleTouchEnd = () => {
      if (!currentIsPulling) return;

      currentIsPulling = false;
      setIsPulling(false);

      if (currentPullDistance > threshold && !currentIsRefreshing) {
        currentIsRefreshing = true;
        setIsRefreshing(true);
        setPullDistance(threshold);

        void (async () => {
          try {
            await onRefresh();
          } finally {
            currentIsRefreshing = false;
            setIsRefreshing(false);
            setPullDistance(0);
          }
        })();
      } else {
        setPullDistance(0);
      }
    };

    // Sync local state with React state
    const syncState = () => {
      currentIsPulling = isPulling;
      currentPullDistance = pullDistance;
      currentIsRefreshing = isRefreshing;
    };

    syncState();

    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh]); // Remove state dependencies to avoid recreating handlers

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: pullDistance }}
            exit={{ height: 0 }}
            className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <motion.div
              animate={{
                rotate: isRefreshing ? 360 : rotation,
                scale: Math.max(0.5, progress),
              }}
              transition={{
                rotate: {
                  duration: isRefreshing ? 1 : 0,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: 'linear',
                },
              }}
              className={`rounded-full p-2 ${
                pullDistance > threshold
                  ? 'text-primary-foreground bg-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <RefreshCw className="h-5 w-5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
