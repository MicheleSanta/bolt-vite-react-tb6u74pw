import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { useErrorHandler } from './useErrorHandler';

interface UseFormStateOptions<T> {
  initialState: T;
  onSuccess?: () => void;
  successMessage?: string;
  resetDelay?: number;
  validationSchema?: z.ZodType<T>;
}

export function useFormState<T extends Record<string, any>>({
  initialState,
  onSuccess,
  successMessage = 'Operazione completata con successo!',
  resetDelay = 3000,
  validationSchema
}: UseFormStateOptions<T>) {
  const [formData, setFormData] = useState<T>(initialState);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { error, handleError, clearError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when success message is shown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success) {
      timer = setTimeout(() => {
        setSuccess(null);
        if (!isSubmitting) {
          resetForm();
        }
      }, resetDelay);
    }
    return () => clearTimeout(timer);
  }, [success, resetDelay, isSubmitting]);

  const resetForm = useCallback(() => {
    setFormData(initialState);
    clearError();
    setSuccess(null);
    setLoading(false);
    setIsSubmitting(false);
  }, [initialState, clearError]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
        ? (value === '' ? '' : parseFloat(value)) 
        : value
    }));
  }, []);

  const validateForm = useCallback((data: T): boolean => {
    if (!validationSchema) return true;

    try {
      validationSchema.parse(data);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        handleError(err.errors[0].message);
      } else {
        handleError(err);
      }
      return false;
    }
  }, [validationSchema, handleError]);

  const handleSubmit = useCallback(async (
    submitFn: (data: T) => Promise<void>
  ) => {
    setIsSubmitting(true);
    setLoading(true);
    clearError();

    try {
      if (!validateForm(formData)) {
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      await submitFn(formData);
      
      setSuccess(successMessage);
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset form after successful submission
      resetForm();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }, [formData, validateForm, successMessage, onSuccess, resetForm, handleError, clearError]);

  return {
    formData,
    setFormData,
    loading,
    error,
    success,
    setSuccess,
    handleChange,
    handleSubmit,
    resetForm,
    clearError
  };
}