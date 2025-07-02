import React from 'react';
import { Save, Loader2, X } from 'lucide-react';
import FormMessage from './FormMessage';

interface FormWrapperProps {
  title: string;
  loading: boolean;
  error: string | null;
  success: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  resetLabel?: string;
  showResetButton?: boolean;
  className?: string;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  title,
  loading,
  error,
  success,
  onSubmit,
  onReset,
  children,
  submitLabel = 'Salva',
  resetLabel = 'Annulla',
  showResetButton = true,
  className = ''
}) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <FormMessage error={error} success={success} />

      <form onSubmit={onSubmit} className="space-y-4">
        {children}

        <div className="flex justify-between pt-4">
          {showResetButton && (
            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              title={resetLabel}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 ${
              !showResetButton ? 'ml-auto' : ''
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormWrapper;