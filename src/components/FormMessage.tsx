import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface FormMessageProps {
  error?: string | null;
  success?: string | null;
}

const FormMessage: React.FC<FormMessageProps> = ({ error, success }) => {
  if (!error && !success) return null;

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
        <Check className="w-5 h-5 mr-2" />
        {success}
      </div>
    );
  }

  return null;
};

export default FormMessage;