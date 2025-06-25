'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ProviderLogoProps {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-16 w-16 text-2xl',
};

export function ProviderLogo({
  src,
  alt,
  fallbackText,
  size = 'md',
  className = '',
}: ProviderLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClass = sizeClasses[size];

  if (!src || imageError) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 ${className}`}
      >
        <span className={`font-bold text-white ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'}`}>
          {fallbackText.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeClass} relative overflow-hidden rounded-lg ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full border-2 border-cyan-500 border-t-transparent h-4 w-4" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        sizes={size === 'lg' ? '64px' : size === 'md' ? '40px' : '32px'}
      />
    </div>
  );
}