'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { AssistantChat } from './AssistantChat';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AssistantToggleProps {
  className?: string;
  defaultOpen?: boolean;
  initialMessage?: string;
}

export function AssistantToggle({
  className,
  defaultOpen = false,
  initialMessage,
}: AssistantToggleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [message, setMessage] = useState(initialMessage);

  const handleOpen = (withMessage?: string) => {
    if (withMessage) {
      setMessage(withMessage);
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage(undefined);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={cn('fixed bottom-6 right-6 z-40', className)}
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => handleOpen()}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="sr-only">Open AI Assistant</span>
            </Button>

            {/* Pulse animation for attention */}
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Chat */}
      <AssistantChat
        isOpen={isOpen}
        onClose={handleClose}
        initialMessage={message}
      />
    </>
  );
}

// Export a hook for programmatically opening the assistant
export function useAssistant() {
  const openAssistant = (message?: string) => {
    // This would need to be connected to a global state or context
    // For now, we'll dispatch a custom event
    const event = new CustomEvent('open-assistant', { detail: { message } });
    window.dispatchEvent(event);
  };

  return { openAssistant };
}

// Add event listener support to the AssistantToggle component
export function AssistantToggleWithListener({
  className,
  defaultOpen = false,
}: AssistantToggleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    const handleOpenAssistant = (event: CustomEvent<{ message?: string }>) => {
      setMessage(event.detail.message);
      setIsOpen(true);
    };

    window.addEventListener(
      'open-assistant',
      handleOpenAssistant as EventListener
    );
    return () => {
      window.removeEventListener(
        'open-assistant',
        handleOpenAssistant as EventListener
      );
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setMessage(undefined);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={cn('fixed bottom-6 right-6 z-40', className)}
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="sr-only">Open AI Assistant</span>
            </Button>

            {/* Pulse animation for attention */}
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Chat */}
      <AssistantChat
        isOpen={isOpen}
        onClose={handleClose}
        initialMessage={message}
      />
    </>
  );
}
