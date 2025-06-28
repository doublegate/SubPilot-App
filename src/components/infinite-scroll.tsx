'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loader?: ReactNode;
  threshold?: number;
}

export function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  loader,
  threshold = 100,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    const current = observerTarget.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <>
      {children}

      {/* Observer target */}
      <div ref={observerTarget} className="h-1" />

      {/* Loading indicator */}
      {isLoading &&
        (loader || (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ))}
    </>
  );
}
