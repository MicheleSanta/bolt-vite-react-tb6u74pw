import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ClienteServicePagheInsert, ClienteServicePaghe, Partner, Fascia, TipologiaEnte } from '../types/database.types';
import { Save, Loader2, X, Check, Building2, Calendar, User, Info, Tag, AlertCircle, RefreshCw, Globe, Lock, KeyRound, MapPin, Mail, Phone, CreditCard } from 'lucide-react';
import FullscreenButton from './FullscreenButton';

interface ClienteServicePagheFormProps {
  onClienteAdded: () => void;
  clienteToEdit?: ClienteServicePaghe | null;
  onCancelEdit?: () => void;
}

const ClienteServicePagheForm: React.FC<ClienteServicePagheFormProps> = ({ 
  onClienteAdded, 
  clienteToEdit = null,
  onCancelEdit
}) => {
  const [cliente, setCliente] = useState<ClienteServicePagheInsert>({
    codice_cliente: '',
    nome_cliente: '',
    numero_commessa: '',
    data_attivazione: '',
    data_cessazione: '',
    tipo_servizio: '',
    software: '',
    fascia: '',
    adempimenti: '',
    referente: '',
    altre_informazioni: '',
    partner: '',
    cedolini_previsti: 1,
    fascia_personalizzata: false,
    url_gestionale: '',
    login_gestionale: '',
    password_gestionale: '',
    indirizzo: '',
    via: '',
    numero_civico: '',
    citta: '',
    cap: '',
    telefono: '',
    cellulare: '',
    email: '',
    pec: '',
    codice_fiscale: '',
    partita_iva: '',
    codice_univoco: '',
    sito_web: '',
    tipologia_ente_id: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [fasce, setFasce] = useState<Fascia[]>([]);
  const [tipologieEnte, setTipologieEnte] = useState<TipologiaEnte[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showFiscalData, setShowFiscalData] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isEditing = !!clienteToEdit;

  useEffect(() => {
    fetchPartners();
    fetchFasce();
    fetchTipologieEnte();
    if (!isEditing) {
      generateNextClientCode();
    }
  }, []);

  useEffect(() => {
    // If we have a cliente to edit, populate the form
    if (clienteToEdit) {
      setCliente({
        codice_cliente: clienteToEdit.codice_cliente,
        nome_cliente: clienteToEdit.nome_cliente,
        numero_commessa: clienteToEdit.numero_commessa || '',
        data_attivazione: clienteToEdit.data_attivazione || '',
        data_cessazione: clienteToEdit.data_cessazione || '',
        tipo_servizio: clienteToEdit.tipo_servizio || '',
        software: clienteToEdit.software || '',
        fascia: clienteToEdit.fascia || '',
        adempimenti: clienteToEdit.adempimenti || '',
        referente: clienteToEdit.referente || '',
        altre_informazioni: clienteToEdit.altre_informazioni || '',
        partner: clienteToEdit.partner || '',
        cedolini_previsti: clienteToEdit.cedolini_previsti || 1,
        fascia_personalizzata: clienteToEdit.fascia_personalizzata || false,
        url_gestionale: clienteToEdit.url_gestionale || '',
        login_gestionale: clienteToEdit.login_gestionale || '',
        password_gestionale: clienteToEdit.password_gestionale || '',
        indirizzo: clienteToEdit.indirizzo || '',
        via: clienteToEdit.via || '',
        numero_civico: clienteToEdit.numero_civico || '',
        citta: clienteToEdit.citta || '',
        cap: clienteToEdit.cap || '',
        telefono: clienteToEdit.telefono || '',
        cellulare: clienteToEdit.cellulare || '',
        email: clienteToEdit.email || '',
        pec: clienteToEdit.pec || '',
        codice_fiscale: clienteToEdit.codice_fiscale || '',
        partita_iva: clienteToEdit.partita_iva || '',
        codice_univoco: clienteToEdit.codice_univoco || '',
        sito_web: clienteToEdit.sito_web || '',
        tipologia_ente_id: clienteToEdit.tipologia_ente_id
      });
      setIsCodeManuallyEdited(true);
      
      // Show sections if they have data
      setShowCredentials(!!(clienteToEdit.url_gestionale || clienteToEdit.login_gestionale || clienteToEdit.password_gestionale));
      setShowContacts(!!(clienteToEdit.telefono || clienteToEdit.cellulare || clienteToEdit.email || clienteToEdit.pec));
      setShowFiscalData(!!(clienteToEdit.codice_fiscale || clienteToEdit.partita_iva || clienteToEdit.codice_univoco));
      setShowAddress(!!(clienteToEdit.indirizzo || clienteToEdit.via || clienteToEdit.citta || clienteToEdit.cap));
    }
  }, [clienteToEdit]);

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

  const fetchFasce = async () => {
    try {
      const { data, error } = await supabase
        .from('fascia')
        .select('*')
        .order('nome', { ascending: true });
        
      if (error) throw error;
      
      setFasce(data || []);
    } catch (err) {
      console.error('Error fetching fasce:', err);
    }
  };

  const fetchTipologieEnte = async () => {
    try {
      const { data, error } = await supabase
        .from('tipologia_ente')
        .select('*')
        .order('descrizione', { ascending: true });
        
      if (error) throw error;
      
      setTipologieEnte(data || []);
    } catch (err) {
      console.error('Error fetching tipologie ente:', err);
    }
  };

  const generateNextClientCode = async () => {
    setIsGeneratingCode(true);
    try {
      // Call the Supabase function to get the next client code
      const { data, error } = await supabase.rpc('get_next_client_code');
      
      if (error) throw error;
      
      if (data) {
        setCliente(prev => ({ ...prev, codice_cliente: data }));
      } else {
        // Fallback if the function doesn't return data
        const { data: manualData, error: manualError } = await supabase
          .from('clienti_service_paghe')
          .select('codice_cliente')
          .order('codice_cliente', { ascending: false })
          .limit(1);
          
        if (manualError) throw manualError;
        
        let nextCode = "C0001"; // Default starting code
        
        if (manualData && manualData.length > 0 && manualData[0].codice_cliente) {
          // Extract the numeric part of the code
          const currentCode = manualData[0].codice_cliente;
          const match = currentCode.match(/^C(\d+)$/);
          
          if (match && match[1]) {
            // Increment the numeric part and pad with zeros
            const nextNumber = parseInt(match[1]) + 1;
            nextCode = `C${nextNumber.toString().padStart(4, '0')}`;
          }
        }
        
        setCliente(prev => ({ ...prev, codice_cliente: nextCode }));
      }
    } catch (err) {
      console.error('Error generating next client code:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setCliente(prev => ({ ...prev, [name]: checked }));
    } else if (['cedolini_previsti', 'tipologia_ente_id'].includes(name)) {
      // Handle numeric values
      const numericValue = parseInt(value) || (name === 'tipologia_ente_id' ? undefined : 1);
      setCliente(prev => ({ 
        ...prev, 
        [name]: numericValue 
      }));
    } else if (name === 'codice_cliente') {
      // Mark code as manually edited
      setIsCodeManuallyEdited(true);
      setCliente(prev => ({ ...prev, [name]: value }));
    } else {
      setCliente(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditing && clienteToEdit) {
        // Update existing record
        const { error } = await supabase
          .from('clienti_service_paghe')
          .update(cliente)
          .eq('id', clienteToEdit.id);
        
        if (error) throw error;
        setSuccess('Cliente aggiornato con successo!');
      } else {
        // Insert new record
        const { error } = await supabase.from('clienti_service_paghe').insert([cliente]);
        
        if (error) throw error;
        
        // Reset form if not editing
        setCliente({
          codice_cliente: '',
          nome_cliente: '',
          numero_commessa: '',
          data_attivazione: '',
          data_cessazione: '',
          tipo_servizio: '',
          software: '',
          fascia: '',
          adempimenti: '',
          referente: '',
          altre_informazioni: '',
          partner: '',
          cedolini_previsti: 1,
          fascia_personalizzata: false,
          url_gestionale: '',
          login_gestionale: '',
          password_gestionale: '',
          indirizzo: '',
          via: '',
          numero_civico: '',
          citta: '',
          cap: '',
          telefono: '',
          cellulare: '',
          email: '',
          pec: '',
          codice_fiscale: '',
          partita_iva: '',
          codice_univoco: '',
          sito_web: '',
          tipologia_ente_id: undefined
        });
        
        setSuccess('Cliente aggiunto con successo!');
        setIsCodeManuallyEdited(false);
        generateNextClientCode();
      }
      
      onClienteAdded();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
        if (isEditing && onCancelEdit) {
          onCancelEdit();
        }
      }, 3000);
    } catch (err) {
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

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {isEditing ? 'Modifica Cliente Service Paghe' : 'Nuovo Cliente Service Paghe'}
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
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mb-4">
            <label htmlFor="codice_cliente" className="block text-sm font-medium text-gray-700 mb-1">
              Codice Cliente
            </label>
            <div className="flex">
              <input
                type="text"
                id="codice_cliente"
                name="codice_cliente"
                value={cliente.codice_cliente}
                onChange={handleChange}
                required
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={generateNextClientCode}
                disabled={isGeneratingCode}
                className="px-3 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-r-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Genera codice automaticamente"
              >
                {isGeneratingCode ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isCodeManuallyEdited 
                ? "Codice cliente modificato manualmente" 
                : "Codice cliente generato automaticamente"}
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="nome_cliente" className="block text-sm font-medium text-gray-700 mb-1">
              Nome Cliente
            </label>
            <input
              type="text"
              id="nome_cliente"
              name="nome_cliente"
              value={cliente.nome_cliente}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="numero_commessa" className="block text-sm font-medium text-gray-700 mb-1">
              Numero Commessa
            </label>
            <input
              type="text"
              id="numero_commessa"
              name="numero_commessa"
              value={cliente.numero_commessa || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="data_attivazione" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Data Attivazione Servizio
            </label>
            <input
              type="date"
              id="data_attivazione"
              name="data_attivazione"
              value={cliente.data_attivazione || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="data_cessazione" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Data Cessazione Servizio
            </label>
            <input
              type="date"
              id="data_cessazione"
              name="data_cessazione"
              value={cliente.data_cessazione || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="tipo_servizio" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo Servizio
            </label>
            <input
              type="text"
              id="tipo_servizio"
              name="tipo_servizio"
              value={cliente.tipo_servizio || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="software" className="block text-sm font-medium text-gray-700 mb-1">
              Software
            </label>
            <input
              type="text"
              id="software"
              name="software"
              value={cliente.software || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="adempimenti" className="block text-sm font-medium text-gray-700 mb-1">
              Adempimenti
            </label>
            <input
              type="text"
              id="adempimenti"
              name="adempimenti"
              value={cliente.adempimenti || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="referente" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              Referente
            </label>
            <input
              type="text"
              id="referente"
              name="referente"
              value={cliente.referente || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="cedolini_previsti" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Tag className="w-4 h-4 mr-1" />
              Cedolini Previsti
            </label>
            <input
              type="number"
              id="cedolini_previsti"
              name="cedolini_previsti"
              value={cliente.cedolini_previsti || 1}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Numero di cedolini mensili previsti per questo cliente
            </p>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <label htmlFor="fascia" className="block text-sm font-medium text-gray-700 mb-1">
                Fascia
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fascia_personalizzata"
                  name="fascia_personalizzata"
                  checked={cliente.fascia_personalizzata}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="fascia_personalizzata" className="ml-2 text-xs text-gray-600">
                  Personalizzata
                </label>
              </div>
            </div>
            {fasce.length > 0 ? (
              <select
                id="fascia"
                name="fascia"
                value={cliente.fascia || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona fascia</option>
                {fasce.map(fascia => (
                  <option key={fascia.id} value={fascia.nome}>
                    Fascia {fascia.nome} - {fascia.min_cedolini || 1}-{fascia.max_cedolini || '∞'} cedolini ({fascia.tariffa.toFixed(2)}€)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="fascia"
                name="fascia"
                value={cliente.fascia || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="partner" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              Partner
            </label>
            {partners.length > 0 ? (
              <select
                id="partner"
                name="partner"
                value={cliente.partner || ''}
                onChange={handleChange}
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
                value={cliente.partner || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="tipologia_ente_id" className="block text-sm font-medium text-gray-700 mb-1">
              Tipologia Ente
            </label>
            <select
              id="tipologia_ente_id"
              name="tipologia_ente_id"
              value={cliente.tipologia_ente_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona tipologia</option>
              {tipologieEnte.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.descrizione} - {tipo.forma_giuridica}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Address Section */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {showAddress ? 'Nascondi indirizzo' : 'Aggiungi indirizzo'}
          </button>
          
          {showAddress && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
              <div className="mb-4">
                <label htmlFor="via" className="block text-sm font-medium text-gray-700 mb-1">
                  Via
                </label>
                <input
                  type="text"
                  id="via"
                  name="via"
                  value={cliente.via || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="numero_civico" className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Civico
                </label>
                <input
                  type="text"
                  id="numero_civico"
                  name="numero_civico"
                  value={cliente.numero_civico || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="citta" className="block text-sm font-medium text-gray-700 mb-1">
                  Città
                </label>
                <input
                  type="text"
                  id="citta"
                  name="citta"
                  value={cliente.citta || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="cap" className="block text-sm font-medium text-gray-700 mb-1">
                  CAP
                </label>
                <input
                  type="text"
                  id="cap"
                  name="cap"
                  value={cliente.cap || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowContacts(!showContacts)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <Phone className="w-4 h-4 mr-2" />
            {showContacts ? 'Nascondi contatti' : 'Aggiungi contatti'}
          </button>
          
          {showContacts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
              <div className="mb-4">
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={cliente.telefono || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="cellulare" className="block text-sm font-medium text-gray-700 mb-1">
                  Cellulare
                </label>
                <input
                  type="tel"
                  id="cellulare"
                  name="cellulare"
                  value={cliente.cellulare || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={cliente.email || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="pec" className="block text-sm font-medium text-gray-700 mb-1">
                  PEC
                </label>
                <input
                  type="email"
                  id="pec"
                  name="pec"
                  value={cliente.pec || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fiscal Data Section */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowFiscalData(!showFiscalData)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {showFiscalData ? 'Nascondi dati fiscali' : 'Aggiungi dati fiscali'}
          </button>
          
          {showFiscalData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
              <div className="mb-4">
                <label htmlFor="codice_fiscale" className="block text-sm font-medium text-gray-700 mb-1">
                  Codice Fiscale
                </label>
                <input
                  type="text"
                  id="codice_fiscale"
                  name="codice_fiscale"
                  value={cliente.codice_fiscale || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="partita_iva" className="block text-sm font-medium text-gray-700 mb-1">
                  Partita IVA
                </label>
                <input
                  type="text"
                  id="partita_iva"
                  name="partita_iva"
                  value={cliente.partita_iva || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="codice_univoco" className="block text-sm font-medium text-gray-700 mb-1">
                  Codice Univoco
                </label>
                <input
                  type="text"
                  id="codice_univoco"
                  name="codice_univoco"
                  value={cliente.codice_univoco || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="sito_web" className="block text-sm font-medium text-gray-700 mb-1">
                  Sito Web
                </label>
                <input
                  type="url"
                  id="sito_web"
                  name="sito_web"
                  value={cliente.sito_web || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.esempio.it"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Software Gestionale Credentials Section */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowCredentials(!showCredentials)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <Lock className="w-4 h-4 mr-2" />
            {showCredentials ? 'Nascondi credenziali gestionale' : 'Aggiungi credenziali gestionale'}
          </button>
          
          {showCredentials && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="mb-4">
                <label htmlFor="url_gestionale" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Globe className="w-4 h-4 mr-1" />
                  URL Gestionale
                </label>
                <input
                  type="url"
                  id="url_gestionale"
                  name="url_gestionale"
                  value={cliente.url_gestionale || ''}
                  onChange={handleChange}
                  placeholder="https://gestionale.esempio.it"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL di accesso al software gestionale
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="login_gestionale" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Login/Username
                </label>
                <input
                  type="text"
                  id="login_gestionale"
                  name="login_gestionale"
                  value={cliente.login_gestionale || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password_gestionale" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <KeyRound className="w-4 h-4 mr-1" />
                  Password
                </label>
                <input
                  type="password"
                  id="password_gestionale"
                  name="password_gestionale"
                  value={cliente.password_gestionale || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="altre_informazioni" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <Info className="w-4 h-4 mr-1" />
            Altre Informazioni
          </label>
          <textarea
            id="altre_informazioni"
            name="altre_informazioni"
            value={cliente.altre_informazioni || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-between">
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
                {isEditing ? 'Aggiorna Cliente' : 'Salva Cliente'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClienteServicePagheForm;