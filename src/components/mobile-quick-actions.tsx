'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Camera, FileDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color?: string;
}

interface MobileQuickActionsProps {
  onAddSubscription: () => void;
  onScanReceipt?: () => void;
  onExport: () => void;
  onSync: () => void;
  className?: string;
}

export function MobileQuickActions({
  onAddSubscription,
  onScanReceipt,
  onExport,
  onSync,
  className,
}: MobileQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Optimized click handlers with useCallback
  const handleAddSubscription = useCallback(() => {
    onAddSubscription();
    setIsOpen(false);
  }, [onAddSubscription]);

  const handleScanReceipt = useCallback(() => {
    onScanReceipt?.();
    setIsOpen(false);
  }, [onScanReceipt]);

  const handleExport = useCallback(() => {
    onExport();
    setIsOpen(false);
  }, [onExport]);

  const handleSync = useCallback(() => {
    onSync();
    setIsOpen(false);
  }, [onSync]);

  // Memoized actions array
  const actions: QuickAction[] = useMemo(
    () => [
      {
        icon: Plus,
        label: 'Add Subscription',
        onClick: handleAddSubscription,
        color: 'bg-blue-500',
      },
      ...(onScanReceipt
        ? [
            {
              icon: Camera,
              label: 'Scan Receipt',
              onClick: handleScanReceipt,
              color: 'bg-green-500',
            },
          ]
        : []),
      {
        icon: FileDown,
        label: 'Export Data',
        onClick: handleExport,
        color: 'bg-purple-500',
      },
      {
        icon: RefreshCw,
        label: 'Sync Now',
        onClick: handleSync,
        color: 'bg-cyan-500',
      },
    ],
    [
      handleAddSubscription,
      handleScanReceipt,
      handleExport,
      handleSync,
      onScanReceipt,
    ]
  );

  return (
    <div className={cn('fixed bottom-20 right-4 z-40', className)}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            {/* Action buttons */}
            <div className="relative">
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ scale: 0, y: 0 }}
                  animate={{
                    scale: 1,
                    y: -(index + 1) * 60,
                  }}
                  exit={{ scale: 0, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: index * 0.05,
                  }}
                  onClick={action.onClick}
                  className={cn(
                    'absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg',
                    action.color ?? 'bg-gray-500'
                  )}
                  aria-label={action.label}
                >
                  <action.icon className="h-5 w-5" />

                  {/* Label */}
                  <span className="absolute right-full mr-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform',
          isOpen && 'rotate-45'
        )}
        aria-label="Quick actions menu"
      >
        <Plus className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
