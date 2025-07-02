import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RendicontazioneInsert, ClienteServicePaghe, Mese, Tecnico, TipoServizio } from '../types/database.types';
import { Save, Loader2, Search, Calendar, AlertCircle, Check, Info, Clock, Car } from 'lucide-react';
import { useFormState } from '../hooks/useFormState';
import FormWrapper from './FormWrapper';

interface DipendenteRendicontazioneFormProps {
  onRendicontazioneSubmitted?: (data: any) => void; // Ensure the prop type is defined
  nomeDipendente: string;
}

const DipendenteRendicontazioneForm: React.FC<DipendenteRendicontazioneFormProps> = ({ 
  onRendicontazioneSubmitted,
  nomeDipendente
}) => {
  const mesi = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const getCurrentMonth = () => {
    return new Date().toLocaleString('it-IT', { month: 'long' });
  };
  
  const initialFormState: RendicontazioneInsert = {
    partner: '',
    nome_tecnico: '',
    mese: getCurrentMonth(),
    id_mese: new Date().getMonth() + 1,
    anno: new Date().getFullYear(),
    codice_cliente: '',
    nome_cliente: '',
    numero_commessa: '',
    numero_cedolini: 0,
    numero_cedolini_extra: 0,
    totale_cedolini: 0,
    fascia: '',
    importo: 0,
    stato: 'Da validare',
    numero_fattura: '',
    anno_fattura: new Date().getFullYear(),
    data_fattura: null, // Impostiamo null direttamente, perché non abbiamo ancora un valore
    tipo_servizio_id: undefined
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
    clearError,
    setSuccess
  } = useFormState({
    initialState: initialFormState,
    onSuccess: onRendicontazioneSubmitted
  });

  const [clienti, setClienti] = useState<ClienteServicePaghe[]>([]);
  const [clientiSuggestions, setClientiSuggestions] = useState<ClienteServicePaghe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteServicePaghe | null>(null);
  const [mesiList, setMesiList] = useState<Mese[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [tecnicoData, setTecnicoData] = useState<Tecnico | null>(null);
  const [tipiServizio, setTipiServizio] = useState<TipoServizio[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchClienti();
    fetchMesi();
    fetchTipiServizio();
  }, []);

  useEffect(() => {
    if (formData.codice_cliente || formData.nome_cliente) {
      const codiceQuery = formData.codice_cliente.toLowerCase();
      const nomeQuery = formData.nome_cliente.toLowerCase();
      
      const filtered = clienti.filter(cliente => 
        (codiceQuery && cliente.codice_cliente.toLowerCase().includes(codiceQuery)) ||
        (nomeQuery && cliente.nome_cliente.toLowerCase().includes(nomeQuery))
      );
      
      setClientiSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setClientiSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.codice_cliente, formData.nome_cliente, clienti]);

  useEffect(() => {
    const totale = formData.numero_cedolini + formData.numero_cedolini_extra;
    setFormData(prev => ({
      ...prev,
      totale_cedolini: totale
    }));
  }, [formData.numero_cedolini, formData.numero_cedolini_extra]);

  useEffect(() => {
    if (formData.codice_cliente && formData.mese && formData.anno) {
      checkForDuplicates();
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.codice_cliente, formData.mese, formData.anno]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users_custom')
          .select(`
            *,
            tecnico:tecnico_id (
              nome
            )
          `)
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;
        
        if (userData?.tecnico?.nome) {
          setFormData(prev => ({
            ...prev,
            nome_tecnico: userData.tecnico.nome
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchClienti = async () => {
    try {
      const { data, error } = await supabase
        .from('clienti_service_paghe')
        .select('*')
        .order('nome_cliente', { ascending: true });
        
      if (error) throw error;
      setClienti(data || []);
    } catch (err) {
      console.error('Error fetching clienti:', err);
    }
  };

  const fetchMesi = async () => {
    try {
      const { data, error } = await supabase
        .from('mese')
        .select('*')
        .order('id', { ascending: true });
        
      if (error) throw error;
      setMesiList(data || []);
    } catch (err) {
      console.error('Error fetching mesi:', err);
    }
  };

  const fetchTipiServizio = async () => {
    try {
      const { data, error } = await supabase
        .from('tipo_servizio')
        .select('*')
        .eq('attivo', true)
        .order('descrizione');
        
      if (error) throw error;
      setTipiServizio(data || []);
    } catch (err) {
      console.error('Error fetching tipi servizio:', err);
    }
  };

  const checkForDuplicates = async () => {
    try {
      const { data, error } = await supabase
        .from('rendicontazione')
        .select('id, nome_cliente')
        .eq('codice_cliente', formData.codice_cliente)
        .eq('mese', formData.mese)
        .eq('anno', formData.anno);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setDuplicateWarning(`Attenzione: Esiste già una rendicontazione per ${data[0].nome_cliente} nel mese di ${formData.mese} ${formData.anno}`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err);
    }
  };

  const handleSelectCliente = (cliente: ClienteServicePaghe) => {
    setFormData(prev => ({
      ...prev,
      codice_cliente: cliente.codice_cliente,
      nome_cliente: cliente.nome_cliente,
      numero_commessa: cliente.numero_commessa || '',
      fascia: cliente.fascia || prev.fascia,
      partner: cliente.partner || prev.partner
    }));
    setShowSuggestions(false);
    setSelectedCliente(cliente);
  };

  const handleFormSubmit = async (data: RendicontazioneInsert) => {
    try {
      if (!data.tipo_servizio_id) {
        throw new Error('Il tipo di servizio è obbligatorio');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert new record with user_id
      const { error } = await supabase.from('rendicontazione').insert([{
        ...data,
        user_id: user.id
      }]);
      
      if (error) throw error;
      
      setSuccess('Rendicontazione inviata con successo! In attesa di validazione.');
      resetForm();
      if (onRendicontazioneSubmitted) {
        onRendicontazioneSubmitted(data);
      } else {
        console.error("onRendicontazioneSubmitted is not defined");
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <FormWrapper
      title="Nuova Rendicontazione"
      loading={loading}
      error={error}
      success={success}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(() => handleFormSubmit(formData));
      }}
      onReset={resetForm}
      submitLabel="Invia Rendicontazione"
      showResetButton={true}
    >
      {duplicateWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {duplicateWarning}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="tipo_servizio_id" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo Servizio
          </label>
          <select
            id="tipo_servizio_id"
            name="tipo_servizio_id"
            value={formData.tipo_servizio_id || ''}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona tipo servizio</option>
            {tipiServizio.map(tipo => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.descrizione}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nome_tecnico" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Dipendente
          </label>
          <input
            type="text"
            id="nome_tecnico"
            name="nome_tecnico"
            value={formData.nome_tecnico}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Nome del dipendente che effettua la rendicontazione</p>
        </div>

        <div>
          <label htmlFor="id_mese" className="block text-sm font-medium text-gray-700 mb-1">
            Mese
          </label>
          {mesiList.length > 0 ? (
            <select
              id="id_mese"
              name="id_mese"
              value={formData.id_mese}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mesiList.map(mese => (
                <option key={mese.id} value={mese.id}>{mese.descrizione}</option>
              ))}
            </select>
          ) : (
            <select
              id="mese"
              name="mese"
              value={formData.mese}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mesi.map(mese => (
                <option key={mese} value={mese}>{mese}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="anno" className="block text-sm font-medium text-gray-700 mb-1">
            Anno
          </label>
          <input
            type="number"
            id="anno"
            name="anno"
            value={formData.anno}
            onChange={handleChange}
            required
            min="2000"
            max="2100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <label htmlFor="codice_cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Codice Cliente
          </label>
          <div className="relative">
            <input
              type="text"
              id="codice_cliente"
              name="codice_cliente"
              value={formData.codice_cliente}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          {showSuggestions && formData.codice_cliente && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
              {clientiSuggestions.map(cliente => (
                <div 
                  key={cliente.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectCliente(cliente)}
                >
                  <div className="font-medium">{cliente.codice_cliente}</div>
                  <div className="text-sm text-gray-600">{cliente.nome_cliente}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label htmlFor="nome_cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Cliente
          </label>
          <div className="relative">
            <input
              type="text"
              id="nome_cliente"
              name="nome_cliente"
              value={formData.nome_cliente}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          {showSuggestions && formData.nome_cliente && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
              {clientiSuggestions.map(cliente => (
                <div 
                  key={cliente.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectCliente(cliente)}
                >
                  <div className="font-medium">{cliente.nome_cliente}</div>
                  <div className="text-sm text-gray-600">Cod: {cliente.codice_cliente}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="numero_commessa" className="block text-sm font-medium text-gray-700 mb-1">
            Numero Commessa/Ordine
          </label>
          <input
            type="text"
            id="numero_commessa"
            name="numero_commessa"
            value={formData.numero_commessa || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Compilato automaticamente se il cliente è presente nell'anagrafica
          </p>
        </div>

        <div>
          <label htmlFor="numero_cedolini" className="block text-sm font-medium text-gray-700 mb-1">
            Numero Cedolini
          </label>
          <input
            type="number"
            id="numero_cedolini"
            name="numero_cedolini"
            value={formData.numero_cedolini}
            onChange={handleChange}
            required
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="numero_cedolini_extra" className="block text-sm font-medium text-gray-700 mb-1">
            Numero Cedolini Extra
          </label>
          <input
            type="number"
            id="numero_cedolini_extra"
            name="numero_cedolini_extra"
            value={formData.numero_cedolini_extra}
            onChange={handleChange}
            required
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="totale_cedolini" className="block text-sm font-medium text-gray-700 mb-1">
            Totale Cedolini
          </label>
          <input
            type="number"
            id="totale_cedolini"
            name="totale_cedolini"
            value={formData.totale_cedolini}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Calcolato automaticamente</p>
        </div>

        <div>
          <label htmlFor="fascia" className="block text-sm font-medium text-gray-700 mb-1">
            Fascia
          </label>
          <input
            type="text"
            id="fascia"
            name="fascia"
            value={formData.fascia}
            onChange={handleChange}
            readOnly={!!selectedCliente?.fascia}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedCliente?.fascia ? 'bg-gray-50' : ''}`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Compilato automaticamente quando selezioni un cliente
          </p>
        </div>
      </div>

      {/* Cliente info */}
      {selectedCliente && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            Informazioni Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data Attivazione:</p>
              <p className="font-medium">
                {selectedCliente.data_attivazione 
                  ? new Date(selectedCliente.data_attivazione).toLocaleDateString('it-IT') 
                  : 'N/D'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fascia Cliente:</p>
              <p className="font-medium">{selectedCliente.fascia || 'N/D'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cedolini Previsti:</p>
              <p className="font-medium">{selectedCliente.cedolini_previsti || 'N/D'}</p>
            </div>
          </div>
        </div>
      )}
    </FormWrapper>
  );
};

export default DipendenteRendicontazioneForm;