import React, { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, AlertCircle, Check, Receipt, Calendar, RefreshCw } from 'lucide-react';

interface BulkUpdateFormProps {
  selectedIds: number[];
  onSuccess: () => void;
  onCancel: () => void;
}

const BATCH_SIZE = 25; // Reduced batch size for better performance

const BulkUpdateForm: React.FC<BulkUpdateFormProps> = ({
  selectedIds,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [formData, setFormData] = useState({
    numero_fattura: '',
    anno_fattura: new Date().getFullYear(),
    data_fattura: new Date().toISOString().split('T')[0],
    stato: 'Fatturato' as const
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'anno_fattura' ? parseInt(value) : value
    }));
  };

  const updateBatch = useCallback(async (ids: number[]) => {
    try {
      // First update the rendicontazione records
      const { error: updateError } = await supabase
        .from('rendicontazione')
        .update({
          numero_fattura: formData.numero_fattura,
          anno_fattura: formData.anno_fattura,
          data_fattura: formData.data_fattura,
          stato: formData.stato
        })
        .in('id', ids);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      // Validation
      if (!formData.numero_fattura) {
        throw new Error('Il numero fattura è obbligatorio');
      }
      if (!formData.data_fattura) {
        throw new Error('La data fattura è obbligatoria');
      }

      // Process in batches
      const batches = [];
      for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
        batches.push(selectedIds.slice(i, i + BATCH_SIZE));
      }

      let completedBatches = 0;
      const totalBatches = batches.length;

      for (const batch of batches) {
        await updateBatch(batch);
        completedBatches++;
        setProgress((completedBatches / totalBatches) * 100);
      }

      setSuccess(`Aggiornate con successo ${selectedIds.length} rendicontazioni`);
      
      // Wait a moment before triggering success callback
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Bulk update error:', err);
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Receipt className="w-6 h-6 mr-2 text-blue-600" />
        Aggiornamento Massivo Fatturazione
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      <div className="mb-4 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-700">
          Stai per aggiornare <strong>{selectedIds.length}</strong> rendicontazioni.
          Questa operazione non può essere annullata.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="numero_fattura" className="block text-sm font-medium text-gray-700 mb-1">
              Numero Fattura
            </label>
            <input
              type="text"
              id="numero_fattura"
              name="numero_fattura"
              value={formData.numero_fattura}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="anno_fattura" className="block text-sm font-medium text-gray-700 mb-1">
              Anno Fattura
            </label>
            <input
              type="number"
              id="anno_fattura"
              name="anno_fattura"
              value={formData.anno_fattura}
              onChange={handleChange}
              required
              min="2000"
              max="2100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="data_fattura" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Data Fattura
            </label>
            <input
              type="date"
              id="data_fattura"
              name="data_fattura"
              value={formData.data_fattura}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Aggiornamento in corso... {Math.round(progress)}%
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Annulla
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aggiornamento...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Aggiorna Rendicontazioni
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BulkUpdateForm;