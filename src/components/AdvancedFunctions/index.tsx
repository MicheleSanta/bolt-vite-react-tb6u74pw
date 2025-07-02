import React, { useState } from 'react';
import { Settings, FileText } from 'lucide-react';
import BulkUpdateForm from './BulkUpdateForm';

interface AdvancedFunctionsProps {
  selectedIds: number[];
  onSuccess: () => void;
  onCancel: () => void;
}

const AdvancedFunctions: React.FC<AdvancedFunctionsProps> = ({
  selectedIds,
  onSuccess,
  onCancel
}) => {
  const [activeFunction, setActiveFunction] = useState<'bulk-update' | null>(null);

  if (!activeFunction) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center mb-6">
          <Settings className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold">Funzioni Avanzate</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => setActiveFunction('bulk-update')}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Aggiornamento Massivo</h3>
            <p className="text-gray-600 text-sm">
              Aggiorna numero fattura, data e stato per tutte le rendicontazioni selezionate.
            </p>
            <p className="text-blue-600 text-sm mt-2">
              {selectedIds.length} rendicontazioni selezionate
            </p>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  if (activeFunction === 'bulk-update') {
    return (
      <BulkUpdateForm
        selectedIds={selectedIds}
        onSuccess={onSuccess}
        onCancel={() => setActiveFunction(null)}
      />
    );
  }

  return null;
};

export default AdvancedFunctions;