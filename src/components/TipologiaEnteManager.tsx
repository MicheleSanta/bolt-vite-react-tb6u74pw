import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Loader2, Edit, Trash2, AlertCircle, Check, X, Building2, RefreshCw } from 'lucide-react';
import SearchBar from './SearchBar';

interface TipologiaEnte {
  id: number;
  descrizione: string;
  forma_giuridica: string;
  created_at: string;
}

interface TipologiaEnteFormData {
  descrizione: string;
  forma_giuridica: string;
}

const TipologiaEnteManager: React.FC = () => {
  const [tipologie, setTipologie] = useState<TipologiaEnte[]>([]);
  const [filteredTipologie, setFilteredTipologie] = useState<TipologiaEnte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tipologiaToEdit, setTipologiaToEdit] = useState<TipologiaEnte | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newTipologia, setNewTipologia] = useState<TipologiaEnteFormData>({
    descrizione: '',
    forma_giuridica: ''
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);

  useEffect(() => {
    fetchTipologie();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, tipologie]);

  const fetchTipologie = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('tipologia_ente')
        .select('*')
        .order('descrizione', { ascending: true });
        
      if (error) throw error;
      
      setTipologie(data || []);
      setFilteredTipologie(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento delle tipologie');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!searchQuery.trim()) {
      setFilteredTipologie(tipologie);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = tipologie.filter(tipologia => 
      tipologia.descrizione.toLowerCase().includes(query) ||
      tipologia.forma_giuridica.toLowerCase().includes(query)
    );
    
    setFilteredTipologie(filtered);
  };

  const validateForm = (data: TipologiaEnteFormData): boolean => {
    const errors: Record<string, string> = {};
    
    if (!data.descrizione) {
      errors.descrizione = 'La descrizione è obbligatoria';
    } else if (data.descrizione.length > 100) {
      errors.descrizione = 'La descrizione non può superare i 100 caratteri';
    }
    
    if (!data.forma_giuridica) {
      errors.forma_giuridica = 'La forma giuridica è obbligatoria';
    } else if (data.forma_giuridica.length > 50) {
      errors.forma_giuridica = 'La forma giuridica non può superare i 50 caratteri';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (tipologiaToEdit) {
      setTipologiaToEdit({ ...tipologiaToEdit, [name]: value });
    } else {
      setNewTipologia({ ...newTipologia, [name]: value });
    }
    
    // Clear validation error for the field being changed
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const dataToValidate = tipologiaToEdit || newTipologia;
      if (!validateForm(dataToValidate)) {
        setLoading(false);
        return;
      }

      if (tipologiaToEdit) {
        // Update existing tipologia
        const { error } = await supabase
          .from('tipologia_ente')
          .update({
            descrizione: tipologiaToEdit.descrizione,
            forma_giuridica: tipologiaToEdit.forma_giuridica
          })
          .eq('id', tipologiaToEdit.id);
        
        if (error) throw error;
        
        setSuccess('Tipologia ente aggiornata con successo!');
        setTipologiaToEdit(null);
      } else {
        // Insert new tipologia
        const { error } = await supabase
          .from('tipologia_ente')
          .insert([newTipologia]);
        
        if (error) throw error;
        
        setSuccess('Tipologia ente aggiunta con successo!');
        setNewTipologia({
          descrizione: '',
          forma_giuridica: ''
        });
      }
      
      // Refresh the list
      fetchTipologie();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tipologia: TipologiaEnte) => {
    setTipologiaToEdit(tipologia);
    setNewTipologia({
      descrizione: '',
      forma_giuridica: ''
    });
    setValidationErrors({});
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    
    try {
      // Check if tipologia is in use
      const { data: usageData, error: usageError } = await supabase
        .from('clienti_service_paghe')
        .select('id')
        .eq('tipologia_ente_id', id)
        .limit(1);
        
      if (usageError) throw usageError;
      
      if (usageData && usageData.length > 0) {
        throw new Error('Non è possibile eliminare questa tipologia perché è in uso da uno o più clienti');
      }
      
      const { error } = await supabase
        .from('tipologia_ente')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh the list
      fetchTipologie();
      setDeleteConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante l\'eliminazione');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setNewTipologia({
      descrizione: '',
      forma_giuridica: ''
    });
    setTipologiaToEdit(null);
    setValidationErrors({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  if (loading && tipologie.length === 0) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Caricamento tipologie ente...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Gestione Tipologie Ente</h2>
      
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
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione *
            </label>
            <input
              type="text"
              id="descrizione"
              name="descrizione"
              value={tipologiaToEdit ? tipologiaToEdit.descrizione : newTipologia.descrizione}
              onChange={handleChange}
              required
              maxLength={100}
              className={`w-full px-3 py-2 border ${
                validationErrors.descrizione ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Es. Comune, Provincia, etc."
            />
            {validationErrors.descrizione && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.descrizione}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="forma_giuridica" className="block text-sm font-medium text-gray-700 mb-1">
              Forma Giuridica *
            </label>
            <input
              type="text"
              id="forma_giuridica"
              name="forma_giuridica"
              value={tipologiaToEdit ? tipologiaToEdit.forma_giuridica : newTipologia.forma_giuridica}
              onChange={handleChange}
              required
              maxLength={50}
              className={`w-full px-3 py-2 border ${
                validationErrors.forma_giuridica ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Es. Ente Pubblico, S.p.A., etc."
            />
            {validationErrors.forma_giuridica && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.forma_giuridica}</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex space-x-2">
            {tipologiaToEdit && (
              <button
                type="button"
                onClick={() => setTipologiaToEdit(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annulla
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {tipologiaToEdit ? 'Aggiorna' : 'Salva'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      
      <div className="mb-4 flex justify-between items-center">
        <SearchBar 
          placeholder="Cerca per descrizione o forma giuridica..." 
          value={searchQuery}
          onChange={setSearchQuery}
        />
        
        <button 
          onClick={fetchTipologie}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Aggiorna
        </button>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrizione
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Forma Giuridica
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Creazione
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTipologie.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                    <p>Nessuna tipologia ente trovata</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTipologie.map((tipologia) => (
                <tr key={tipologia.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tipologia.descrizione}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tipologia.forma_giuridica}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(tipologia.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(tipologia)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifica tipologia"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      {deleteConfirmation === tipologia.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDelete(tipologia.id)}
                            disabled={deletingId === tipologia.id}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                          >
                            {deletingId === tipologia.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Conferma'
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmation(null)}
                            className="text-gray-600 hover:text-gray-800 text-xs"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmation(tipologia.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Elimina tipologia"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TipologiaEnteManager;