import { useCallback } from 'react';
import { toast } from 'sonner';
import { TRPCClientError } from '@trpc/client';

interface ErrorToastOptions {
  title?: string;
  fallbackMessage?: string;
}

/**
 * Hook for displaying user-friendly error messages
 */
export function useErrorToast() {
  const showError = useCallback(
    (error: unknown, options?: ErrorToastOptions) => {
      console.error('Error:', error);

      let message = options?.fallbackMessage ?? 'An unexpected error occurred';
      let description: string | undefined;

      // Handle TRPC errors
      if (error instanceof TRPCClientError) {
        const data = error.data as { error?: unknown } | undefined;

        // Check for custom error format
        if (
          data?.error &&
          typeof data.error === 'object' &&
          data.error !== null
        ) {
          const errorObj = data.error as { message?: string };
          message = errorObj.message ?? message;
        } else {
          message = error.message;
        }

        // Add error code for debugging in development
        if (process.env.NODE_ENV === 'development') {
          const code = (error.shape as { code?: string } | undefined)?.code;
          description = `Error Code: ${code ?? 'UNKNOWN'}`;
        }
      }
      // Handle regular errors
      else if (error instanceof Error) {
        message = error.message;
      }
      // Handle string errors
      else if (typeof error === 'string') {
        message = error;
      }

      // Show toast
      toast.error(options?.title ?? 'Error', {
        description: description ?? message,
      });
    },
    []
  );

  const showSuccess = useCallback((message: string, description?: string) => {
    toast.success('Success', {
      description: description ?? message,
    });
  }, []);

  const showWarning = useCallback((message: string, description?: string) => {
    toast.warning('Warning', {
      description: description ?? message,
    });
  }, []);

  return {
    showError,
    showSuccess,
    showWarning,
  };
}

/**
 * Wrapper for async operations with error handling
 */
export function useAsyncError() {
  const { showError } = useErrorToast();

  const execute = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options?: ErrorToastOptions
    ): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (error) {
        showError(error, options);
        return undefined;
      }
    },
    [showError]
  );

  return execute;
}
