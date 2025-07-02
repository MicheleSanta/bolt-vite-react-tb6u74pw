import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface UseFormResetOptions<T> {
  initialState: T;
  onSuccess?: () => void;
  successMessage?: string;
  resetDelay?: number;
}

export function useFormReset<T>({ 
  initialState, 
  onSuccess, 
  successMessage = 'Operazione completata con successo!',
  resetDelay = 3000 
}: UseFormResetOptions<T>) {
  const [formData, setFormData] = useState<T>(initialState);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { error, handleError, clearError } = useErrorHandler();

  const resetForm = useCallback(() => {
    setFormData(initialState);
    clearError();
    setSuccess(null);
  }, [initialState, clearError]);

  const handleSuccess = useCallback(() => {
    setSuccess(successMessage);
    resetForm();
    
    if (onSuccess) {
      onSuccess();
    }

    // Auto-clear success message
    const timer = setTimeout(() => {
      setSuccess(null);
    }, resetDelay);

    return () => clearTimeout(timer);
  }, [successMessage, resetDelay, onSuccess, resetForm]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
        ? parseFloat(value) || 0
        : value
    }));
  }, []);

  return {
    formData,
    setFormData,
    loading,
    setLoading,
    error,
    success,
    setSuccess,
    handleError,
    clearError,
    resetForm,
    handleSuccess,
    handleChange
  };
}