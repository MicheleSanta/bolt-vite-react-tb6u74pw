import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TipoServizio, TipoServizioInsert } from '../types/database.types';
import { Save, Loader2, Edit, Trash2, AlertCircle, Check, X, Tag, Power, Search, Calendar, RefreshCw } from 'lucide-react';
import SearchBar from './SearchBar';

const TipoServizioManager: React.FC = () => {
  const [servizi, setServizi] = useState<TipoServizio[]>([]);
  const [filteredServizi, setFilteredServizi] = useState<TipoServizio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [servicioToEdit, setServicioToEdit] = useState<TipoServizio | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [newServizio, setNewServizio] = useState<TipoServizioInsert>({
    codice_servizio: '',
    descrizione: '',
    attivo: true
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchServizi();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, showInactive, servizi]);

  const fetchServizi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('tipo_servizio')
        .select('*')
        .order('codice_servizio', { ascending: true });
        
      if (error) throw error;
      
      setServizi(data || []);
      setFilteredServizi(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento dei servizi');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...servizi];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(servizio => 
        servizio.codice_servizio.toLowerCase().includes(query) ||
        servizio.descrizione.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (!showInactive) {
      filtered = filtered.filter(servizio => servizio.attivo);
    }
    
    setFilteredServizi(filtered);
  };

  const validateForm = (data: TipoServizioInsert | TipoServizio): boolean => {
    const errors: Record<string, string> = {};
    
    if (!data.codice_servizio) {
      errors.codice_servizio = 'Il codice servizio è obbligatorio';
    } else if (data.codice_servizio.length > 50) {
      errors.codice_servizio = 'Il codice servizio non può superare i 50 caratteri';
    }
    
    if (!data.descrizione) {
      errors.descrizione = 'La descrizione è obbligatoria';
    } else if (data.descrizione.length > 200) {
      errors.descrizione = 'La descrizione non può superare i 200 caratteri';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (servicioToEdit) {
        setServicioToEdit({ ...servicioToEdit, [name]: checked });
      } else {
        setNewServizio({ ...newServizio, [name]: checked });
      }
    } else {
      if (servicioToEdit) {
        setServicioToEdit({ ...servicioToEdit, [name]: value });
      } else {
        setNewServizio({ ...newServizio, [name]: value });
      }
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
      const dataToValidate = servicioToEdit || newServizio;
      if (!validateForm(dataToValidate)) {
        return;
      }

      if (servicioToEdit) {
        // Update existing service
        const { error } = await supabase
          .from('tipo_servizio')
          .update({
            codice_servizio: servicioToEdit.codice_servizio,
            descrizione: servicioToEdit.descrizione,
            attivo: servicioToEdit.attivo
          })
          .eq('id', servicioToEdit.id);
        
        if (error) throw error;
        
        setSuccess('Servizio aggiornato con successo!');
        setServicioToEdit(null);
      } else {
        // Insert new service
        const { error } = await supabase
          .from('tipo_servizio')
          .insert([newServizio]);
        
        if (error) throw error;
        
        setSuccess('Servizio aggiunto con successo!');
        resetForm();
      }
      
      // Refresh the list
      fetchServizi();
      
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

  const resetForm = () => {
    setNewServizio({
      codice_servizio: '',
      descrizione: '',
      attivo: true
    });
    setServicioToEdit(null);
    setValidationErrors({});
  };

  const handleEdit = (servizio: TipoServizio) => {
    setServicioToEdit(servizio);
    setNewServizio({
      codice_servizio: '',
      descrizione: '',
      attivo: true
    });
    setValidationErrors({});
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    
    try {
      // Check if service is in use
      const { data: usageData, error: usageError } = await supabase
        .from('rendicontazione')
        .select('id')
        .eq('tipo_servizio_id', id)
        .limit(1);
        
      if (usageError) throw usageError;
      
      if (usageData && usageData.length > 0) {
        throw new Error('Non è possibile eliminare questo servizio perché è in uso in una o più rendicontazioni');
      }
      
      const { error } = await supabase
        .from('tipo_servizio')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh the list
      fetchServizi();
      setDeleteConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante l\'eliminazione');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tipo_servizio')
        .update({ attivo: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh the list
      fetchServizi();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante la modifica dello stato');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/D';
    try {
      return new Date(dateString).toLocaleString('it-IT');
    } catch (e) {
      return 'N/D';
    }
  };

  if (loading && servizi.length === 0) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Caricamento servizi...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Gestione Tipi di Servizio</h2>
      
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
            <label htmlFor="codice_servizio" className="block text-sm font-medium text-gray-700 mb-1">
              Codice Servizio *
            </label>
            <input
              type="text"
              id="codice_servizio"
              name="codice_servizio"
              value={servicioToEdit ? servicioToEdit.codice_servizio : newServizio.codice_servizio}
              onChange={handleChange}
              required
              maxLength={50}
              className={`w-full px-3 py-2 border ${
                validationErrors.codice_servizio ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Es. SP, CU, etc."
            />
            {validationErrors.codice_servizio && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.codice_servizio}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione *
            </label>
            <input
              type="text"
              id="descrizione"
              name="descrizione"
              value={servicioToEdit ? servicioToEdit.descrizione : newServizio.descrizione}
              onChange={handleChange}
              required
              maxLength={200}
              className={`w-full px-3 py-2 border ${
                validationErrors.descrizione ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Descrizione del servizio"
            />
            {validationErrors.descrizione && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.descrizione}</p>
            )}
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="attivo"
              name="attivo"
              checked={servicioToEdit ? servicioToEdit.attivo : newServizio.attivo}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="attivo" className="ml-2 block text-sm text-gray-700">
              Servizio attivo
            </label>
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
            {servicioToEdit && (
              <button
                type="button"
                onClick={() => setServicioToEdit(null)}
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
                  {servicioToEdit ? 'Aggiorna Servizio' : 'Aggiungi Servizio'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <SearchBar 
            placeholder="Cerca per codice o descrizione..." 
            value={searchQuery}
            onChange={setSearchQuery}
          />
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">
              Mostra servizi inattivi
            </span>
          </label>
        </div>
        
        <button 
          onClick={fetchServizi}
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
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Codice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrizione
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Creazione
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ultima Modifica
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredServizi.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Tag className="w-8 h-8 text-gray-300 mb-2" />
                    <p>Nessun tipo di servizio trovato</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredServizi.map((servizio) => (
                <tr key={servizio.id} className={`hover:bg-gray-50 ${!servizio.attivo ? 'bg-gray-50 text-gray-500' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{servizio.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{servizio.codice_servizio}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{servizio.descrizione}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      servizio.attivo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {servizio.attivo ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {formatDate(servizio.data_creazione)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {servizio.data_modifica ? formatDate(servizio.data_modifica) : 'N/D'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(servizio)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifica servizio"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleToggleStatus(servizio.id, servizio.attivo)}
                        className={`${
                          servizio.attivo 
                            ? 'text-red-600 hover:text-red-800' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={servizio.attivo ? 'Disattiva servizio' : 'Attiva servizio'}
                      >
                        <Power className="w-5 h-5" />
                      </button>
                      
                      {deleteConfirmation === servizio.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDelete(servizio.id)}
                            disabled={deletingId === servizio.id}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                          >
                            {deletingId === servizio.id ? (
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
                          onClick={() => setDeleteConfirmation(servizio.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Elimina servizio"
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

export default TipoServizioManager;