import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FatturazioneInsert, Fatturazione } from '../types/database.types';
import { Calendar, FileText, CreditCard } from 'lucide-react';
import { useFormState } from '../hooks/useFormState';
import { fatturazioneSchema } from '../schemas/formSchemas';
import FormWrapper from './FormWrapper';

interface FatturazioneFormProps {
  onFatturazioneAdded: () => void;
  fatturazioneToEdit?: Fatturazione | null;
  onCancelEdit?: () => void;
  affidamentoId: number;
  affidamentoTotale: number;
}

const FatturazioneForm: React.FC<FatturazioneFormProps> = ({ 
  onFatturazioneAdded, 
  fatturazioneToEdit = null,
  onCancelEdit,
  affidamentoId,
  affidamentoTotale
}) => {
  const initialState: FatturazioneInsert = {
    affidamento_id: affidamentoId,
    percentuale: 100,
    importo: affidamentoTotale,
    data_scadenza: new Date().toISOString().split('T')[0],
    stato: 'Da emettere',
    numero_fattura: '',
    data_emissione: '',
    data_pagamento: '',
    note: ''
  };

  const {
    formData,
    setFormData,
    loading,
    error,
    success,
    handleChange,
    handleSubmit,
    resetForm,
    clearError
  } = useFormState({
    initialState: fatturazioneToEdit || initialState,
    onSuccess: onFatturazioneAdded,
    validationSchema: fatturazioneSchema
  });

  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  useEffect(() => {
    if (fatturazioneToEdit) {
      setFormData(fatturazioneToEdit);
      
      // Show advanced fields if they have data
      setShowAdvancedFields(!!(
        fatturazioneToEdit.numero_fattura || 
        fatturazioneToEdit.data_emissione || 
        fatturazioneToEdit.data_pagamento || 
        fatturazioneToEdit.note
      ));
    }
  }, [fatturazioneToEdit, setFormData]);

  // Update importo when percentuale changes
  useEffect(() => {
    const importo = (affidamentoTotale * formData.percentuale) / 100;
    setFormData(prev => ({
      ...prev,
      importo: parseFloat(importo.toFixed(2))
    }));
  }, [formData.percentuale, affidamentoTotale, setFormData]);

  const handleFormSubmit = async (data: FatturazioneInsert) => {
    if (fatturazioneToEdit) {
      // Update existing record
      const { error } = await supabase
        .from('fatturazione')
        .update(data)
        .eq('id', fatturazioneToEdit.id);
      
      if (error) throw error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('fatturazione')
        .insert([data]);
      
      if (error) throw error;
    }
  };

  return (
    <FormWrapper
      title={fatturazioneToEdit ? 'Modifica Scadenza Fatturazione' : 'Nuova Scadenza Fatturazione'}
      loading={loading}
      error={error}
      success={success}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(() => handleFormSubmit(formData));
      }}
      onReset={resetForm}
      submitLabel={fatturazioneToEdit ? 'Aggiorna Scadenza' : 'Salva Scadenza'}
      showResetButton={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="percentuale" className="block text-sm font-medium text-gray-700 mb-1">
            Percentuale (%)
          </label>
          <input
            type="number"
            id="percentuale"
            name="percentuale"
            value={formData.percentuale}
            onChange={handleChange}
            required
            min="0"
            max="100"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="importo" className="block text-sm font-medium text-gray-700 mb-1">
            Importo (€)
          </label>
          <input
            type="number"
            id="importo"
            name="importo"
            value={formData.importo}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="data_scadenza" className="block text-sm font-medium text-gray-700 mb-1">
            Data Scadenza
          </label>
          <input
            type="date"
            id="data_scadenza"
            name="data_scadenza"
            value={formData.data_scadenza}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="stato" className="block text-sm font-medium text-gray-700 mb-1">
            Stato
          </label>
          <select
            id="stato"
            name="stato"
            value={formData.stato}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Da emettere">Da emettere</option>
            <option value="Emessa">Emessa</option>
            <option value="Pagata">Pagata</option>
          </select>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowAdvancedFields(!showAdvancedFields)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
        >
          <FileText className="w-4 h-4 mr-2" />
          {showAdvancedFields ? 'Nascondi campi avanzati' : 'Mostra campi avanzati'}
        </button>
        
        {showAdvancedFields && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
            <div>
              <label htmlFor="numero_fattura" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Numero Fattura
              </label>
              <input
                type="text"
                id="numero_fattura"
                name="numero_fattura"
                value={formData.numero_fattura}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="data_emissione" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Data Emissione
              </label>
              <input
                type="date"
                id="data_emissione"
                name="data_emissione"
                value={formData.data_emissione}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="data_pagamento" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Data Pagamento
              </label>
              <input
                type="date"
                id="data_pagamento"
                name="data_pagamento"
                value={formData.data_pagamento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="md:col-span-3">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Inserisci eventuali note sulla fatturazione..."
              />
            </div>
          </div>
        )}
      </div>
    </FormWrapper>
  );
};

export default FatturazioneForm;