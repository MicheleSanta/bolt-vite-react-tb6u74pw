import { useState } from 'react';

interface ErrorHandler {
  error: string | null;
  setError: (error: string | null) => void;
  handleError: (err: unknown) => void;
  clearError: () => void;
}

export const useErrorHandler = (): ErrorHandler => {
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    console.error('Error:', err);
    if (err instanceof Error) {
      setError(err.message);
    } else if (typeof err === 'string') {
      setError(err);
    } else {
      setError('Si è verificato un errore imprevisto');
    }
  };

  const clearError = () => setError(null);

  return { error, setError, handleError, clearError };
};