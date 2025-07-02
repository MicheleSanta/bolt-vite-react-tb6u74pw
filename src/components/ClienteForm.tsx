import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { ClienteInsert, Cliente } from '../types/database.types';
import { Building2, MapPin, FileText, Mail, Globe, Info } from 'lucide-react';
import { useFormState } from '../hooks/useFormState';
import { clienteSchema } from '../schemas/formSchemas';
import FormWrapper from './FormWrapper';

interface ClienteFormProps {
  onClienteAdded: () => void;
  clienteToEdit?: Cliente | null;
  onCancelEdit?: () => void;
}

const initialState: ClienteInsert = {
  denominazione: '',
  referente: '',
  cellulare: '',
  email: '',
  ufficio: '',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  codice_fiscale: '',
  partita_iva: '',
  pec: '',
  codice_univoco: '',
  sito_web: '',
  note: ''
};

const ClienteForm: React.FC<ClienteFormProps> = ({ 
  onClienteAdded, 
  clienteToEdit = null,
  onCancelEdit
}) => {
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
    initialState: clienteToEdit || initialState,
    onSuccess: onClienteAdded,
    validationSchema: clienteSchema
  });

  const [showResidenza, setShowResidenza] = useState(false);
  const [showFiscalData, setShowFiscalData] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  useEffect(() => {
    if (clienteToEdit) {
      setFormData(clienteToEdit);
      
      // Show sections if they have data
      setShowResidenza(!!(clienteToEdit.indirizzo || clienteToEdit.citta || clienteToEdit.cap || clienteToEdit.provincia));
      setShowFiscalData(!!(clienteToEdit.codice_fiscale || clienteToEdit.partita_iva || clienteToEdit.pec || clienteToEdit.codice_univoco));
      setShowAdditionalInfo(!!(clienteToEdit.sito_web || clienteToEdit.note));
    }
  }, [clienteToEdit, setFormData]);

  const handleFormSubmit = async (data: ClienteInsert) => {
    if (clienteToEdit) {
      // Update existing record
      const { error } = await supabase
        .from('clienti')
        .update(data)
        .eq('id', clienteToEdit.id);
      
      if (error) throw error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('clienti')
        .insert([data]);
      
      if (error) throw error;
    }
  };

  return (
    <FormWrapper
      title={clienteToEdit ? 'Modifica Cliente' : 'Nuovo Cliente'}
      loading={loading}
      error={error}
      success={success}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(() => handleFormSubmit(formData));
      }}
      onReset={resetForm}
      submitLabel={clienteToEdit ? 'Aggiorna Cliente' : 'Salva Cliente'}
      showResetButton={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="denominazione" className="block text-sm font-medium text-gray-700 mb-1">
            Denominazione
          </label>
          <input
            type="text"
            id="denominazione"
            name="denominazione"
            value={formData.denominazione}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="ufficio" className="block text-sm font-medium text-gray-700 mb-1">
            Ufficio
          </label>
          <input
            type="text"
            id="ufficio"
            name="ufficio"
            value={formData.ufficio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="referente" className="block text-sm font-medium text-gray-700 mb-1">
            Referente
          </label>
          <input
            type="text"
            id="referente"
            name="referente"
            value={formData.referente}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="cellulare" className="block text-sm font-medium text-gray-700 mb-1">
            Cellulare
          </label>
          <input
            type="tel"
            id="cellulare"
            name="cellulare"
            value={formData.cellulare}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="pec" className="block text-sm font-medium text-gray-700 mb-1">
            PEC
          </label>
          <input
            type="email"
            id="pec"
            name="pec"
            value={formData.pec}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowFiscalData(!showFiscalData)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
        >
          <FileText className="w-4 h-4 mr-2" />
          {showFiscalData ? 'Nascondi dati fiscali' : 'Aggiungi dati fiscali'}
        </button>
        
        {showFiscalData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md mb-4">
            <div>
              <label htmlFor="codice_fiscale" className="block text-sm font-medium text-gray-700 mb-1">
                Codice Fiscale
              </label>
              <input
                type="text"
                id="codice_fiscale"
                name="codice_fiscale"
                value={formData.codice_fiscale}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="partita_iva" className="block text-sm font-medium text-gray-700 mb-1">
                Partita IVA
              </label>
              <input
                type="text"
                id="partita_iva"
                name="partita_iva"
                value={formData.partita_iva}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="codice_univoco" className="block text-sm font-medium text-gray-700 mb-1">
                Codice Univoco
              </label>
              <input
                type="text"
                id="codice_univoco"
                name="codice_univoco"
                value={formData.codice_univoco}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowResidenza(!showResidenza)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
        >
          <MapPin className="w-4 h-4 mr-2" />
          {showResidenza ? 'Nascondi dati residenza' : 'Aggiungi dati residenza'}
        </button>
        
        {showResidenza && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
            <div>
              <label htmlFor="indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
                Indirizzo
              </label>
              <input
                type="text"
                id="indirizzo"
                name="indirizzo"
                value={formData.indirizzo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="citta" className="block text-sm font-medium text-gray-700 mb-1">
                Città
              </label>
              <input
                type="text"
                id="citta"
                name="citta"
                value={formData.citta}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="cap" className="block text-sm font-medium text-gray-700 mb-1">
                CAP
              </label>
              <input
                type="text"
                id="cap"
                name="cap"
                value={formData.cap}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
                Provincia
              </label>
              <input
                type="text"
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
        >
          <Info className="w-4 h-4 mr-2" />
          {showAdditionalInfo ? 'Nascondi informazioni aggiuntive' : 'Aggiungi informazioni aggiuntive'}
        </button>
        
        {showAdditionalInfo && (
          <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-md">
            <div>
              <label htmlFor="sito_web" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Sito Web
              </label>
              <input
                type="url"
                id="sito_web"
                name="sito_web"
                value={formData.sito_web}
                onChange={handleChange}
                placeholder="https://www.esempio.it"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
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
                placeholder="Inserisci eventuali note o informazioni aggiuntive sul cliente..."
              />
            </div>
          </div>
        )}
      </div>
    </FormWrapper>
  );
};

export default ClienteForm;