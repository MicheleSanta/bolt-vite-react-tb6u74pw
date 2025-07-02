import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RendicontazioneInsert, Rendicontazione, Partner, Tecnico, Fascia, ClienteServicePaghe, Mese, RendicontazioneTrasferteInsert, TipoServizio } from '../types/database.types';
import { Save, Loader2, Calculator, X, Check, FileSpreadsheet, Search, Receipt, Calendar, Clock, Info, AlertCircle, Car, Plus, Trash } from 'lucide-react';
import FullscreenButton from './FullscreenButton';

interface RendicontazioneFormProps {
  onRendicontazioneAdded: () => void;
  rendicontazioneToEdit?: Rendicontazione | null;
  onCancelEdit?: () => void;
}

const RendicontazioneForm: React.FC<RendicontazioneFormProps> = ({ 
  onRendicontazioneAdded, 
  rendicontazioneToEdit = null,
  onCancelEdit
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
    stato: 'Da fatturare',
    numero_fattura: '',
    anno_fattura: new Date().getFullYear(),
    data_fattura: null,
    tipo_servizio_id: undefined
  };

  const [rendicontazione, setRendicontazione] = useState<RendicontazioneInsert>(initialFormState);
  const [trasferte, setTrasferte] = useState<RendicontazioneTrasferteInsert[]>([{
    rendicontazione_id: 0,
    importo_unitario: 0,
    numero_trasferte: 0,
    note: '',
    data_trasferta: new Date().toISOString().split('T')[0]
  }]);
  const [showTrasferte, setShowTrasferte] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [fasce, setFasce] = useState<Fascia[]>([]);
  const [clienti, setClienti] = useState<ClienteServicePaghe[]>([]);
  const [clientiSuggestions, setClientiSuggestions] = useState<ClienteServicePaghe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoSelectFascia, setAutoSelectFascia] = useState(true);
  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFascia, setSelectedFascia] = useState<Fascia | null>(null);
  const [mesiList, setMesiList] = useState<Mese[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteServicePaghe | null>(null);
  const [fasciaAnno, setFasciaAnno] = useState<number>(new Date().getFullYear());
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [tipiServizio, setTipiServizio] = useState<TipoServizio[]>([]);
  const isEditing = !!rendicontazioneToEdit;
const dataFattura = rendicontazione.data_fattura ? rendicontazione.data_fattura : null;
 

  useEffect(() => {
    fetchPartners();
    fetchTecnici();
    fetchFasce();
    fetchClienti();
    fetchMesi();
    fetchTipiServizio();
  }, []);

  useEffect(() => {
    if (rendicontazioneToEdit) {
      setRendicontazione({
        partner: rendicontazioneToEdit.partner,
        nome_tecnico: rendicontazioneToEdit.nome_tecnico,
        mese: rendicontazioneToEdit.mese,
        id_mese: rendicontazioneToEdit.id_mese || getMeseIdFromDescrizione(rendicontazioneToEdit.mese),
        anno: rendicontazioneToEdit.anno,
        codice_cliente: rendicontazioneToEdit.codice_cliente,
        nome_cliente: rendicontazioneToEdit.nome_cliente,
        numero_commessa: rendicontazioneToEdit.numero_commessa || '',
        numero_cedolini: rendicontazioneToEdit.numero_cedolini,
        numero_cedolini_extra: rendicontazioneToEdit.numero_cedolini_extra,
        totale_cedolini: rendicontazioneToEdit.totale_cedolini,
        fascia: rendicontazioneToEdit.fascia,
        importo: rendicontazioneToEdit.importo,
        stato: rendicontazioneToEdit.stato || 'Da fatturare',
        numero_fattura: rendicontazioneToEdit.numero_fattura || '',
        anno_fattura: rendicontazioneToEdit.anno_fattura || new Date().getFullYear(),
        data_fattura: rendicontazioneToEdit.data_fattura || '',
        tipo_servizio_id: rendicontazioneToEdit.tipo_servizio_id
      });

      if (rendicontazioneToEdit.trasferte && rendicontazioneToEdit.trasferte.length > 0) {
        const trasferteToEdit = rendicontazioneToEdit.trasferte.map(t => ({
          rendicontazione_id: rendicontazioneToEdit.id,//ok
          importo_unitario: t.importo_unitario,
          numero_trasferte: t.numero_trasferte,
          note: t.note || '',
          data_trasferta: t.data_trasferta || new Date().toISOString().split('T')[0]
        }));
        setTrasferte(trasferteToEdit);
        setShowTrasferte(true);
      }

      setAutoSelectFascia(false);
      setShowInvoiceFields(
        rendicontazioneToEdit.stato === 'Fatturato' || 
        !!rendicontazioneToEdit.numero_fattura || 
        !!rendicontazioneToEdit.data_fattura
      );

      if (rendicontazioneToEdit.codice_cliente) {
        fetchClienteByCode(rendicontazioneToEdit.codice_cliente);
      }
    }
  }, [rendicontazioneToEdit]);

  useEffect(() => {
    const totale = rendicontazione.numero_cedolini + rendicontazione.numero_cedolini_extra;
    setRendicontazione(prev => ({
      ...prev,
      totale_cedolini: totale
    }));
  }, [rendicontazione.numero_cedolini, rendicontazione.numero_cedolini_extra]);

  useEffect(() => {
    if (autoSelectFascia && fasce.length > 0 && rendicontazione.totale_cedolini > 0) {
      const appropriateFascia = findAppropriateFascia(rendicontazione.totale_cedolini, fasciaAnno);
      if (appropriateFascia && appropriateFascia.nome !== rendicontazione.fascia) {
        setRendicontazione(prev => ({
          ...prev,
          fascia: appropriateFascia.nome
        }));
        setSelectedFascia(appropriateFascia);
      }
    }
  }, [rendicontazione.totale_cedolini, fasce, autoSelectFascia, fasciaAnno]);

  useEffect(() => {
    if (fasce.length > 0 && rendicontazione.fascia) {
      const fascia = fasce.find(f => f.nome === rendicontazione.fascia && f.anno === fasciaAnno);
      if (fascia) {
        setSelectedFascia(fascia);
      }
    }
  }, [rendicontazione.fascia, fasce, fasciaAnno]);

  useEffect(() => {
    if (selectedFascia) {
      const tariffa = selectedFascia.tariffa;
      const ore = selectedFascia.ore || 1;
      const importo = tariffa * ore;
      
      setRendicontazione(prev => ({
        ...prev,
        importo: parseFloat(importo.toFixed(2))
      }));
    }
  }, [selectedFascia]);

  useEffect(() => {
    if (rendicontazione.codice_cliente || rendicontazione.nome_cliente) {
      const codiceQuery = rendicontazione.codice_cliente.toLowerCase();
      const nomeQuery = rendicontazione.nome_cliente.toLowerCase();
      
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
  }, [rendicontazione.codice_cliente, rendicontazione.nome_cliente, clienti]);

  useEffect(() => {
    if (rendicontazione.stato === 'Fatturato') {
      setShowInvoiceFields(true);
    }
  }, [rendicontazione.stato]);

  useEffect(() => {
    if (rendicontazione.id_mese && mesiList.length > 0) {
      const meseObj = mesiList.find(m => m.id === rendicontazione.id_mese);
      if (meseObj) {
        setRendicontazione(prev => ({
          ...prev,
          mese: meseObj.descrizione
        }));
      }
    }
  }, [rendicontazione.id_mese, mesiList]);

  useEffect(() => {
    if (rendicontazione.mese && mesiList.length > 0) {
      const meseId = getMeseIdFromDescrizione(rendicontazione.mese);
      if (meseId && meseId !== rendicontazione.id_mese) {
        setRendicontazione(prev => ({
          ...prev,
          id_mese: meseId
        }));
      }
    }
  }, [rendicontazione.mese, mesiList]);

  useEffect(() => {
    if (selectedCliente && selectedCliente.data_attivazione) {
      const attivationYear = new Date(selectedCliente.data_attivazione).getFullYear();
      setFasciaAnno(attivationYear);
      fetchFasceByYear(attivationYear);
    }
  }, [selectedCliente]);

  useEffect(() => {
    if (rendicontazione.codice_cliente && rendicontazione.mese && rendicontazione.anno) {
      checkForDuplicates();
    } else {
      setDuplicateWarning(null);
    }
  }, [rendicontazione.codice_cliente, rendicontazione.mese, rendicontazione.anno]);

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

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partner')
        .select('*')
        .order('nome', { ascending: true });
        
      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
    }
  };

  const fetchTecnici = async () => {
    try {
      const { data, error } = await supabase
        .from('tecnico')
        .select('*')
        .order('nome', { ascending: true });
        
      if (error) throw error;
      setTecnici(data || []);
    } catch (err) {
      console.error('Error fetching tecnici:', err);
    }
  };

  const fetchFasce = async () => {
    try {
      const { data, error } = await supabase
        .from('fascia')
        .select('*')
        .order('anno', { ascending: false })
        .order('nome', { ascending: true });
        
      if (error) throw error;
      setFasce(data || []);
    } catch (err) {
      console.error('Error fetching fasce:', err);
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

  const getMeseIdFromDescrizione = (descrizione: string): number | undefined => {
    if (mesiList.length > 0) {
      const meseObj = mesiList.find(m => m.descrizione === descrizione);
      return meseObj?.id;
    }
    
    const meseMap: Record<string, number> = {
      'Gennaio': 1,
      'Febbraio': 2,
      'Marzo': 3,
      'Aprile': 4,
      'Maggio': 5,
      'Giugno': 6,
      'Luglio': 7,
      'Agosto': 8,
      'Settembre': 9,
      'Ottobre': 10,
      'Novembre': 11,
      'Dicembre': 12
    };
    
    return meseMap[descrizione];
  };

  const fetchClienteByCode = async (codiceCliente: string) => {
    try {
      const { data, error } = await supabase
        .from('clienti_service_paghe')
        .select('*')
        .eq('codice_cliente', codiceCliente)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setSelectedCliente(data);
        
        if (data.data_attivazione) {
          const attivationYear = new Date(data.data_attivazione).getFullYear();
          setFasciaAnno(attivationYear);
          fetchFasceByYear(attivationYear);
        }
      }
    } catch (err) {
      console.error('Error fetching cliente by code:', err);
    }
  };

  const fetchFasceByYear = async (year: number) => {
    try {
      const { data, error } = await supabase
        .from('fascia')
        .select('*')
        .eq('anno', year)
        .order('nome', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setFasce(data);
        
        if (autoSelectFascia && rendicontazione.totale_cedolini > 0) {
          const appropriateFascia = findAppropriateFascia(rendicontazione.totale_cedolini, year);
          if (appropriateFascia) {
            setRendicontazione(prev => ({
              ...prev,
              fascia: appropriateFascia.nome
            }));
            setSelectedFascia(appropriateFascia);
          }
        }
      } else {
        fetchFasce();
      }
    } catch (err) {
      console.error('Error fetching fasce by year:', err);
    }
  };

  const checkForDuplicates = async () => {
    try {
      const { data, error } = await supabase
        .from('rendicontazione')
        .select('id, nome_cliente')
        .eq('codice_cliente', rendicontazione.codice_cliente)
        .eq('mese', rendicontazione.mese)
        .eq('anno', rendicontazione.anno);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setDuplicateWarning(`Attenzione: Esiste già una rendicontazione per ${data[0].nome_cliente} nel mese di ${rendicontazione.mese} ${rendicontazione.anno}`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setRendicontazione(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    if (['anno', 'numero_cedolini', 'numero_cedolini_extra', 'totale_cedolini', 'importo', 'anno_fattura', 'id_mese', 'tipo_servizio_id'].includes(name)) {
      setRendicontazione(prev => ({ 
        ...prev, 
        [name]: name === 'importo' ? parseFloat(value) : parseInt(value) || 0 
      }));
    } else {
      setRendicontazione(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectCliente = (cliente: ClienteServicePaghe) => {
    setRendicontazione(prev => ({
      ...prev,
      codice_cliente: cliente.codice_cliente,
      nome_cliente: cliente.nome_cliente,
      numero_commessa: cliente.numero_commessa || '',
      fascia: cliente.fascia || prev.fascia,
      partner: cliente.partner || prev.partner
    }));
    setShowSuggestions(false);
    setSelectedCliente(cliente);
    
    if (cliente.fascia && fasce.length > 0) {
      const fascia = fasce.find(f => f.nome === cliente.fascia);
      if (fascia) {
        setSelectedFascia(fascia);
        setAutoSelectFascia(false);
      }
    }
    
    if (cliente.data_attivazione) {
      const attivationYear = new Date(cliente.data_attivazione).getFullYear();
      setFasciaAnno(attivationYear);
      fetchFasceByYear(attivationYear);
    }
  };

  const resetForm = () => {
    const currentMese = rendicontazione.mese;
    const currentIdMese = rendicontazione.id_mese;
    
    const newFormState = {
      ...initialFormState,
      partner: partners.length > 0 ? partners[0].nome : '',
      nome_tecnico: tecnici.length > 0 ? tecnici[0].nome : '',
      fascia: fasce.length > 0 ? fasce[0].nome : 'A',
      mese: currentMese,
      id_mese: currentIdMese
    };
    
    setRendicontazione(newFormState);
    setShowInvoiceFields(false);
    setAutoSelectFascia(true);
    setSelectedCliente(null);
    setFasciaAnno(new Date().getFullYear());
    setDuplicateWarning(null);
    setShowTrasferte(false);
    setTrasferte([{
      rendicontazione_id: 0,
      importo_unitario: 0,
      numero_trasferte: 0,
      note: '',
      data_trasferta: new Date().toISOString().split('T')[0]
    }]);
    
    if (fasce.length > 0) {
      const defaultFascia = fasce.find(f => f.nome === newFormState.fascia);
      if (defaultFascia) {
        setSelectedFascia(defaultFascia);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!rendicontazione.tipo_servizio_id) {
        throw new Error('Il tipo di servizio è obbligatorio');
      }

      if (rendicontazione.stato === 'Fatturato') {
        if (!rendicontazione.numero_fattura) {
          throw new Error('Il numero fattura è obbligatorio quando lo stato è "Fatturato"');
        }
        if (!rendicontazione.data_fattura) {
          throw new Error('La data fattura è obbligatoria quando lo stato è "Fatturato"');
        }
      }
// Ensure data_fattura is null if it is an empty string
      
      const rendicontazioneData = {
        ...rendicontazione,
        data_fattura: rendicontazione.data_fattura === '' ? null : rendicontazione.data_fattura
      };
      
      let rendicontazioneId: number;

      if (isEditing && rendicontazioneToEdit) {
        // Update existing rendicontazione
        const { error } = await supabase
          .from('rendicontazione')
          .update(rendicontazioneData)
          .eq('id', rendicontazioneToEdit.id);
        
        if (error) throw error;
        rendicontazioneId = rendicontazioneToEdit.id;
        
        // Delete existing trasferte
        if (showTrasferte) {
          const { error: deleteError } = await supabase
            .from('rendicontazione_trasferte')
            .delete()
            .eq('rendicontazione_id', rendicontazioneId);
            
          if (deleteError) throw deleteError;
        }
      } else {
        // Insert new rendicontazione
        const { data: insertedData, error } = await supabase
          .from('rendicontazione')
          .insert([{
          partner: rendicontazione.partner,
          nome_tecnico: rendicontazione.nome_tecnico,
          mese: rendicontazione.mese,
          id_mese: rendicontazione.id_mese,
          anno: rendicontazione.anno,
          codice_cliente: rendicontazione.codice_cliente,
          nome_cliente: rendicontazione.nome_cliente,
          numero_commessa: rendicontazione.numero_commessa,
          numero_cedolini: rendicontazione.numero_cedolini,
          numero_cedolini_extra: rendicontazione.numero_cedolini_extra,
          totale_cedolini: rendicontazione.totale_cedolini,
          fascia: rendicontazione.fascia,
          importo: rendicontazione.importo,
          stato: rendicontazione.stato,
          numero_fattura: rendicontazione.numero_fattura,
          anno_fattura: rendicontazione.anno_fattura,
          data_fattura: rendicontazione.data_fattura,
          tipo_servizio_id: rendicontazione.tipo_servizio_id
        }])
        .select()
        .single();
        
        if (error) throw error;
        if (!insertedData) throw new Error('Errore durante l\'inserimento della rendicontazione');
        
        rendicontazioneId = insertedData.id;
      }

      // Insert trasferte if enabled
      if (showTrasferte && trasferte.length > 0) {
  const trasferteToInsert = trasferte.map(t => ({
    rendicontazione_id: rendicontazioneId,  // ✅ Usiamo l'ID corretto della rendicontazione
    importo_unitario: t.importo_unitario,
    numero_trasferte: t.numero_trasferte,
    note: t.note || '',
    data_trasferta: t.data_trasferta || new Date().toISOString().split('T')[0]
  }));

  const { error: trasferteError } = await supabase
    .from('rendicontazione_trasferte')
    .insert(trasferteToInsert);

  if (trasferteError) throw trasferteError;
}
      setSuccess(isEditing ? 'Rendicontazione aggiornata con successo!' : 'Rendicontazione aggiunta con successo!');
      
      if (!isEditing) {
        resetForm();
      } else {
        resetForm(); // Reset the form after updating
      }
      
      onRendicontazioneAdded();
      
      setTimeout(() => {
        setSuccess(null);
        if (isEditing && onCancelEdit) {
          onCancelEdit();
        }
      }, 3000);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const findAppropriateFascia = (totaleCedolini: number, anno: number): Fascia | null => {
    const fasceDellAnno = fasce.filter(f => f.anno === anno);
    return fasceDellAnno.find(f => 
      totaleCedolini >= (f.min_cedolini || 1) && 
      totaleCedolini <= (f.max_cedolini || 999999)
    ) || null;
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {isEditing ? 'Modifica Rendicontazione' : 'Nuova Rendicontazione'}
        </h2>
        <div className="flex items-center space-x-2">
          <FullscreenButton 
            isFullscreen={isFullscreen} 
            onClick={toggleFullscreen} 
          />
          {isEditing && onCancelEdit && (
            <button 
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}
      
      {duplicateWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {duplicateWarning}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mb-4">
            <label htmlFor="tipo_servizio_id" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo Servizio
            </label>
            <select
              id="tipo_servizio_id"
              name="tipo_servizio_id"
              value={rendicontazione.tipo_servizio_id || ''}
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

          <div className="mb-4">
            <label htmlFor="partner" className="block text-sm font-medium text-gray-700 mb-1">
              Partner
            </label>
            {partners.length > 0 ? (
              <select
                id="partner"
                name="partner"
                value={rendicontazione.partner}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona partner</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.nome}>{partner.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="partner"
                name="partner"
                value={rendicontazione.partner}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome partner"
              />
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="nome_tecnico" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Tecnico
            </label>
            {tecnici.length > 0 ? (
              <select
                id="nome_tecnico"
                name="nome_tecnico"
                value={rendicontazione.nome_tecnico}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona tecnico</option>
                {tecnici.map(tecnico => (
                  <option key={tecnico.id} value={tecnico.nome}>{tecnico.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="nome_tecnico"
                name="nome_tecnico"
                value={rendicontazione.nome_tecnico}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome tecnico"
              />
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="id_mese" className="block text-sm font-medium text-gray-700 mb-1">
              Mese
            </label>
            {mesiList.length > 0 ? (
              <select
                id="id_mese"
                name="id_mese"
                value={rendicontazione.id_mese}
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
                value={rendicontazione.mese}
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
          
          <div className="mb-4">
            <label htmlFor="anno" className="block text-sm font-medium text-gray-700 mb-1">
              Anno
            </label>
            <input
              type="number"
              id="anno"
              name="anno"
              value={rendicontazione.anno}
              onChange={handleChange}
              required
              min="2000"
              max="2100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4 relative">
            <label htmlFor="codice_cliente" className="block text-sm font-medium text-gray-700 mb-1">
              Codice Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                id="codice_cliente"
                name="codice_cliente"
                value={rendicontazione.codice_cliente}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            {showSuggestions && rendicontazione.codice_cliente && (
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
          
          <div className="mb-4 relative">
            <label htmlFor="nome_cliente" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                id="nome_cliente"
                name="nome_cliente"
                value={rendicontazione.nome_cliente}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            {showSuggestions && rendicontazione.nome_cliente && (
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
          
          <div className="mb-4">
            <label htmlFor="numero_commessa" className="block text-sm font-medium text-gray-700 mb-1">
              Numero Commessa/Ordine
            </label>
            <input
              type="text"
              id="numero_commessa"
              name="numero_commessa"
              value={rendicontazione.numero_commessa || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Compilato automaticamente se il cliente è presente nell'anagrafica
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="numero_cedolini" className="block text-sm font-medium text-gray-700 mb-1">
              Numero Cedolini
            </label>
            <input
              type="number"
              id="numero_cedolini"
              name="numero_cedolini"
              value={rendicontazione.numero_cedolini}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="numero_cedolini_extra" className="block text-sm font-medium text-gray-700 mb-1">
              Numero Cedolini Extra
            </label>
            <input
              type="number"
              id="numero_cedolini_extra"
              name="numero_cedolini_extra"
              value={rendicontazione.numero_cedolini_extra}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="totale_cedolini" className="block text-sm font-medium text-gray-700 mb-1">
              Totale Cedolini
            </label>
            <input
              type="number"
              id="totale_cedolini"
              name="totale_cedolini"
              value={rendicontazione.totale_cedolini}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Calcolato automaticamente</p>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <label htmlFor="fascia" className="block text-sm font-medium text-gray-700 mb-1">
                Fascia
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSelectFascia"
                  checked={autoSelectFascia}
                  onChange={(e) => setAutoSelectFascia(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoSelectFascia" className="ml-2 text-xs text-gray-600">
                  Auto-seleziona fascia
                </label>
              </div>
            </div>
            {fasce.length > 0 ? (
              <select
                id="fascia"
                name="fascia"
                value={rendicontazione.fascia}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={autoSelectFascia && rendicontazione.totale_cedolini > 0}
              >
                <option value="">Seleziona fascia</option>
                {fasce.map(fascia => (
                  <option key={fascia.id} value={fascia.nome}>
                    Fascia {fascia.nome} - {fascia.min_cedolini || 1}-{fascia.max_cedolini || '∞'} cedolini ({fascia.tariffa.toFixed(2)}€ x {fascia.ore || 1} ore)
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="fascia"
                name="fascia"
                value={rendicontazione.fascia}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona fascia</option>
                <option value="A">Fascia A</option>
                <option value="B">Fascia B</option>
                <option value="C">Fascia C</option>
                <option value="D">Fascia D</option>
                <option value="E">Fascia E</option>
                <option value="F">Fascia F</option>
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Puoi gestire le fasce e le tariffe nella sezione "Fasce"
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="importo" className="block text-sm font-medium text-gray-700 mb-1">
              Importo (€)
            </label>
            <input
              type="number"
              id="importo"
              name="importo"
              value={rendicontazione.importo}
              readOnly={fasce.length > 0}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fasce.length > 0 ? 'bg-gray-50' : ''}`}
            />
            {selectedFascia && (
              <div className="mt-1 text-xs text-gray-600 bg-blue-50 p-2 rounded-md">
                <p className="font-medium flex items-center">
                  <Calculator className="w-3 h-3 mr-1" />
                  Calcolo importo:
                </p>
                <p>
                  Tariffa fascia {selectedFascia.nome}: {selectedFascia.tariffa.toFixed(2)}€ x {selectedFascia.ore || 1} ore = {formatCurrency(rendicontazione.importo)}
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="stato" className="block text-sm font-medium text-gray-700 mb-1">
              Stato
            </label>
            <select
              id="stato"
              name="stato"
              value={rendicontazione.stato}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Da fatturare">Da fatturare</option>
              <option value="Fatturato">Fatturato</option>
            </select>
          </div>
        </div>
        
        {/* Trasferte Section */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowTrasferte(!showTrasferte)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <Car className="w-4 h-4 mr-2" />
            {showTrasferte ? 'Nascondi spese trasferta' : 'Aggiungi spese trasferta'}
          </button>
          
          {showTrasferte && (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-medium text-gray-700">Spese Trasferta</h3>
                <button
                  type="button"
                  onClick={() => setTrasferte([...trasferte, {
                    id: 0,
                    importo_unitario: 0,
                    numero_trasferte: 0,
                    note: '',
                    data_trasferta: new Date().toISOString().split('T')[0]
                  }])}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Aggiungi Trasferta
                </button>
              </div>
              
              {trasferte.map((trasferta, index) => (
                <div key={index} className="mb-4 p-4 bg-white rounded-md border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Trasferta #{index + 1}</h4>
                    {trasferte.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTrasferte(trasferte.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor={`data_trasferta_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Data Trasferta
                      </label>
                      <input
                        type="date"
                        id={`data_trasferta_${index}`}
                        name="data_trasferta"
                        value={trasferta.data_trasferta}
                        onChange={(e) => {
                          const newTrasferte = [...trasferte];
                          newTrasferte[index] = { ...newTrasferte[index], data_trasferta: e.target.value };
                          setTrasferte(newTrasferte);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`importo_unitario_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Importo per Trasferta (€)
                      </label>
                      <input
                        type="number"
                        id={`importo_unitario_${index}`}
                        name="importo_unitario"
                        value={trasferta.importo_unitario}
                        onChange={(e) => {
                          const newTrasferte = [...trasferte];
                          newTrasferte[index] = { ...newTrasferte[index], importo_unitario: parseFloat(e.target.value) || 0 };
                          setTrasferte(newTrasferte);
                        }}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`numero_trasferte_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Numero Trasferte
                      </label>
                      <input
                        type="number"
                        id={`numero_trasferte_${index}`}
                        name="numero_trasferte"
                        value={trasferta.numero_trasferte}
                        onChange={(e) => {
                          const newTrasferte = [...trasferte];
                          newTrasferte[index] = { ...newTrasferte[index], numero_trasferte: parseInt(e.target.value) || 0 };
                          setTrasferte(newTrasferte);
                        }}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`importo_totale_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Importo Totale
                      </label>
                      <input
                        type="text"
                        id={`importo_totale_${index}`}
                        value={formatCurrency(trasferta.importo_unitario * trasferta.numero_trasferte)}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <label htmlFor={`note_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      id={`note_${index}`}
                      name="note"
                      value={trasferta.note}
                      onChange={(e) => {
                        const newTrasferte = [...trasferte];
                        newTrasferte[index] = { ...newTrasferte[index], note: e.target.value };
                        setTrasferte(newTrasferte);
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Note opzionali sulla trasferta..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Invoice fields */}
        {(showInvoiceFields || rendicontazione.stato === 'Fatturato') && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-md font-medium text-blue-700 mb-3 flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Dati Fatturazione
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="mb-4">
                <label htmlFor="numero_fattura" className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Fattura
                </label>
                <input
                  type="text"
                  id="numero_fattura"
                  name="numero_fattura"
                  value={rendicontazione.numero_fattura || ''}
                  onChange={handleChange}
                  required={rendicontazione.stato === 'Fatturato'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="anno_fattura" className="block text-sm font-medium text-gray-700 mb-1">
                  Anno Fattura
                </label>
                <input
                  type="number"
                  id="anno_fattura"
                  name="anno_fattura"
                  value={rendicontazione.anno_fattura || new Date().getFullYear()}
                  onChange={handleChange}
                  required={rendicontazione.stato === 'Fatturato'}
                  min="2000"
                  max="2100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="data_fattura" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Data Fattura
                </label>
                <input
                  type="date"
                  id="data_fattura"
                  name="data_fattura"
                  value={rendicontazione.data_fattura || ''}
                  onChange={handleChange}
                  required={rendicontazione.stato === 'Fatturato'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Show/hide invoice fields button */}
        {rendicontazione.stato !== 'Fatturato' && (
          <button
            type="button"
            onClick={() => setShowInvoiceFields(!showInvoiceFields)}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            {showInvoiceFields ? (
              <>
                <X className="w-4 h-4 mr-1" />
                Nascondi dati fatturazione
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-1" />
                Mostra dati fatturazione
              </>
            )}
          </button>
        )}
        
        {/* Cliente info */}
        {selectedCliente && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
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
            <div className="mt-2 text-xs text-blue-600">
              <p>Anno di riferimento per la fascia: {fasciaAnno}</p>
            </div>
          </div>
        )}
        
        {/* Fascia details */}
        {selectedFascia && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Dettagli Fascia {selectedFascia.nome}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Range Cedolini:</p>
                <p className="font-medium">{selectedFascia.min_cedolini || 1} - {selectedFascia.max_cedolini || '∞'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tariffa Oraria:</p>
                <p className="font-medium">{formatCurrency(selectedFascia.tariffa)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ore:</p>
                <p className="font-medium">{selectedFascia.ore || 1} {selectedFascia.ore === 1 ? 'ora' : 'ore'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Anno Fascia:</p>
                <p className="font-medium">{selectedFascia.anno || 'N/D'}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          {isEditing && onCancelEdit && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Annulla
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 ${isEditing ? '' : 'ml-auto'}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Aggiornamento...' : 'Salvataggio...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Aggiorna Rendicontazione' : 'Salva Rendicontazione'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RendicontazioneForm;