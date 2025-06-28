'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Archive, Edit, Trash2 } from 'lucide-react';
import { SubscriptionCard } from './subscription-card';
import type { Subscription } from './subscription-list';

interface SwipeableSubscriptionCardProps {
  subscription: Subscription;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function SwipeableSubscriptionCard({
  subscription,
  onEdit,
  onArchive,
  onDelete,
}: SwipeableSubscriptionCardProps) {
  const [isSwipedLeft, setIsSwipedLeft] = useState(false);
  const [isSwipedRight, setIsSwipedRight] = useState(false);
  const controls = useAnimation();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset swipe state when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        resetSwipe();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const resetSwipe = async () => {
    await controls.start({ x: 0 });
    setIsSwipedLeft(false);
    setIsSwipedRight(false);
  };

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    const distance = info.offset.x;

    // Swipe right to reveal edit/archive actions
    if (distance > threshold || velocity > 500) {
      await controls.start({ x: 120 });
      setIsSwipedRight(true);
      setIsSwipedLeft(false);
    }
    // Swipe left to reveal delete action
    else if (distance < -threshold || velocity < -500) {
      await controls.start({ x: -80 });
      setIsSwipedLeft(true);
      setIsSwipedRight(false);
    }
    // Snap back to center
    else {
      await resetSwipe();
    }
  };

  const handleCardClick = () => {
    if (!isSwipedLeft && !isSwipedRight) {
      router.push(`/subscriptions/${subscription.id}`);
    } else {
      resetSwipe();
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      {/* Background actions - Right swipe */}
      <div className="absolute inset-y-0 left-0 flex w-[120px] items-center">
        <button
          onClick={() => {
            onEdit?.();
            resetSwipe();
          }}
          className="flex h-full w-1/2 items-center justify-center bg-blue-500 text-white transition-opacity hover:bg-blue-600"
          aria-label="Edit subscription"
        >
          <Edit className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            onArchive?.();
            resetSwipe();
          }}
          className="flex h-full w-1/2 items-center justify-center bg-yellow-500 text-white transition-opacity hover:bg-yellow-600"
          aria-label="Archive subscription"
        >
          <Archive className="h-5 w-5" />
        </button>
      </div>

      {/* Background actions - Left swipe */}
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center">
        <button
          onClick={() => {
            onDelete?.();
            resetSwipe();
          }}
          className="flex h-full w-full items-center justify-center bg-red-500 text-white transition-opacity hover:bg-red-600"
          aria-label="Delete subscription"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 120 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative z-10 cursor-grab active:cursor-grabbing"
        onClick={handleCardClick}
      >
        <SubscriptionCard subscription={subscription} />
      </motion.div>
    </div>
  );
}