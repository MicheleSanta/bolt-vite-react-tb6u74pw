import { useState, useCallback } from 'react';

interface ValidationRule<T> {
  test: (value: T) => boolean;
  message: string;
}

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

export function useFormValidation<T extends Record<string, any>>(rules: ValidationRules<T>) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validateField = useCallback((name: keyof T, value: T[keyof T]) => {
    const fieldRules = rules[name];
    if (!fieldRules) return true;

    for (const rule of fieldRules) {
      if (!rule.test(value)) {
        setErrors(prev => ({ ...prev, [name]: rule.message }));
        return false;
      }
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    return true;
  }, [rules]);

  const validateForm = useCallback((data: T) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(rules).forEach((key) => {
      const fieldRules = rules[key as keyof T];
      if (!fieldRules) return;

      const value = data[key as keyof T];
      for (const rule of fieldRules) {
        if (!rule.test(value)) {
          newErrors[key as keyof T] = rule.message;
          isValid = false;
          break;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors
  };
}