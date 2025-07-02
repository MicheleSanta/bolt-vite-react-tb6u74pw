import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Rendicontazione } from '../types/database.types';
import { Loader2, RefreshCw, FileText, Edit, Trash2, AlertCircle, Filter, X, Calculator, Receipt, Calendar, CheckCircle, Clock, DollarSign, Car } from 'lucide-react';
import SearchBar from './SearchBar';
import ExcelExport from './ExcelExport';

interface RendicontazioneListProps {
  refreshTrigger: number;
  onEditRendicontazione: (rendicontazione: Rendicontazione) => void;
}

interface TotalsState {
  daFatturare: number;
  fatturato: number;
  filteredDaFatturare: number;
  filteredFatturato: number;
  trasferte: number;
  filteredTrasferte: number;
  emesse: number;
  pagate: number;
}

const monthOrder: Record<string, number> = {
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

const RendicontazioneList: React.FC<RendicontazioneListProps> = ({ 
  refreshTrigger, 
  onEditRendicontazione
}) => {
  const [rendicontazioni, setRendicontazioni] = useState<Rendicontazione[]>([]);
  const [filteredRendicontazioni, setFilteredRendicontazioni] = useState<Rendicontazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMese, setFilterMese] = useState<string>('');
  const [filterAnno, setFilterAnno] = useState<number | ''>('');
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [filterStato, setFilterStato] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);
  const [totals, setTotals] = useState<TotalsState>({
    daFatturare: 0,
    fatturato: 0,
    filteredDaFatturare: 0,
    filteredFatturato: 0,
    trasferte: 0,
    filteredTrasferte: 0,
    emesse: 0,
    pagate: 0
  });
const handleEdit = (rendicontazione: Rendicontazione) => {
  console.log("Modifica rendicontazione:", rendicontazione);
  onEditRendicontazione(rendicontazione);
};

  useEffect(() => {
    fetchRendicontazioni();
  }, [refreshTrigger]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterMese, filterAnno, filterPartner, filterStato, rendicontazioni]);

  const fetchRendicontazioni = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('rendicontazione')
        .select(`
          *,
          tipo_servizio (
            id,
            codice_servizio,
            descrizione
          ),
          trasferte:rendicontazione_trasferte(id,
            rendicontazione_id,
            importo_unitario,
            numero_trasferte,
            importo_totale,
            note
          )
        `)
        .order('created_at', { ascending: false });
      if (error) {
       console.error("Errore nel caricamento delle rendicontazioni:", error);
}
console.log("Dati rendicontazioni recuperati:", data);
      if (error) throw error;
      
      // Sort by year (descending) and month (chronological)
      const sortedData = [...(data || [])].sort((a, b) => {
        if (a.anno !== b.anno) {
          return b.anno - a.anno;
        }
        return monthOrder[a.mese] - monthOrder[b.mese];
      });
      
      setRendicontazioni(sortedData);
      applyFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento delle rendicontazioni');
      setRendicontazioni([]);
      setFilteredRendicontazioni([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rendicontazioni];
    
    if (filterMese) {
      filtered = filtered.filter(item => item.mese === filterMese);
    }
    
    if (filterAnno !== '') {
      filtered = filtered.filter(item => item.anno === filterAnno);
    }
    
    if (filterPartner) {
      filtered = filtered.filter(item => item.partner === filterPartner);
    }
    
    if (filterStato) {
      filtered = filtered.filter(item => item.stato === filterStato);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.nome_cliente && item.nome_cliente.toLowerCase().includes(query)) ||
        (item.codice_cliente && item.codice_cliente.toLowerCase().includes(query)) ||
        (item.nome_tecnico && item.nome_tecnico.toLowerCase().includes(query)) ||
        (item.partner && item.partner.toLowerCase().includes(query)) ||
        (item.mese && item.mese.toLowerCase().includes(query))
      );
    }
    
    setFilteredRendicontazioni(filtered);
    calculateTotals(filtered);
  };

  const calculateTotals = (data: Rendicontazione[]) => {
    const newTotals = {
      daFatturare: 0,
      fatturato: 0,
      filteredDaFatturare: 0,
      filteredFatturato: 0,
      trasferte: 0,
      filteredTrasferte: 0,
      emesse: 0,
      pagate: 0
    };

    data.forEach(item => {
      const trasferteAmount = item.totale_trasferta || 0;
      const totalAmount = item.importo + trasferteAmount;

      newTotals.trasferte += trasferteAmount;

      if (item.stato === 'Da fatturare') {
        newTotals.daFatturare += totalAmount;
      } else if (item.stato === 'Fatturato') {
        newTotals.fatturato += totalAmount;
        if (item.data_fattura) {
          newTotals.emesse += totalAmount;
          if (item.data_pagamento) {
            newTotals.pagate += totalAmount;
          }
        }
      }
    });

    setTotals(newTotals);
  };

  const getUniqueMesi = () => {
    return [...new Set(rendicontazioni.map(r => r.mese))].sort((a, b) => {
      return monthOrder[a] - monthOrder[b];
    });
  };

  const getUniqueAnni = () => {
    return [...new Set(rendicontazioni.map(r => r.anno))].sort((a, b) => b - a);
  };

  const getUniquePartners = () => {
    return [...new Set(rendicontazioni.map(r => r.partner).filter(Boolean))].sort();
  };

  const prepareExportData = (data: Rendicontazione[]) => {
    return data.map(item => ({
      Anno: item.anno,
      Mese: item.mese,
      Partner: item.partner || '',
      'Nome Tecnico': item.nome_tecnico,
      'Codice Cliente': item.codice_cliente,
      'Nome Cliente': item.nome_cliente,
      'Numero Commessa': item.numero_commessa || '',
      'Numero Cedolini': item.numero_cedolini,
      'Cedolini Extra': item.numero_cedolini_extra,
      'Totale Cedolini': item.totale_cedolini,
      Fascia: item.fascia,
      'Importo Rendicontazione': item.importo,
      'Numero Trasferte': item.numero_trasferte || 0,
      'Totale Trasferte': item.totale_trasferta || 0,
      'Importo Totale': item.importo + (item.totale_trasferta || 0),
      Stato: item.stato || 'Da fatturare',
      'Numero Fattura': item.numero_fattura || '',
      'Data Fattura': item.data_fattura ? new Date(item.data_fattura).toLocaleDateString('it-IT') : '',
      Note: item.trasferte?.[0]?.note || ''
    }));
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setDeleteError(null);
    
    try {
      // First delete any associated travel expenses
      const { error: trasferteError } = await supabase
        .from('rendicontazione_trasferte')
        .delete()
        .eq('rendicontazione_id', id);
        
      if (trasferteError) throw trasferteError;
      
      // Then delete the rendicontazione
      const { error } = await supabase
        .from('rendicontazione')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      fetchRendicontazioni();
      setDeleteConfirmation(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Si è verificato un errore durante l\'eliminazione');
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setFilterMese('');
    setFilterAnno('');
    setFilterPartner('');
    setFilterStato('');
    setSearchQuery('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatTrasfertaInfo = (numeroTrasferte: number | null, totaleTrasferta: number | null) => {
    if (numeroTrasferte === null || totaleTrasferta === null) {
      return {
        text: 'Dati non disponibili',
        tooltip: 'Informazioni sulle trasferte non disponibili',
        hasTrasferte: false
      };
    }

    if (numeroTrasferte === 0 || totaleTrasferta === 0) {
      return {
        text: 'Nessuna trasferta',
        tooltip: 'Nessuna trasferta registrata',
        hasTrasferte: false
      };
    }

    const text = `${numeroTrasferte} trasfert${numeroTrasferte === 1 ? 'a' : 'e'}`;
    const tooltip = `${numeroTrasferte} trasfert${numeroTrasferte === 1 ? 'a' : 'e'} - Totale: ${formatCurrency(totaleTrasferta)}`;
    
    return {
      text,
      tooltip,
      hasTrasferte: true,
      totale: totaleTrasferta
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Caricamento rendicontazioni...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
        <button 
          onClick={fetchRendicontazioni}
          className="mt-2 flex items-center text-red-700 hover:text-red-900"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-xl font-semibold">Elenco Rendicontazioni</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <Filter className="w-4 h-4 mr-1" />
            {showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
          </button>
          <button 
            onClick={fetchRendicontazioni} 
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Aggiorna
          </button>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-yellow-600 font-medium">Da Fatturare</p>
              <p className="text-lg font-bold text-yellow-700">{formatCurrency(totals.daFatturare)}</p>
            </div>
            <Receipt className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-orange-600 font-medium">Totale Trasferte</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totals.trasferte)}</p>
            </div>
            <Car className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-blue-600 font-medium">Emesse</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.emesse)}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-green-600 font-medium">Pagate</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totals.pagate)}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <SearchBar 
          placeholder="Cerca per cliente, dipendente, mese..." 
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="p-4">
        <ExcelExport 
          data={prepareExportData(filteredRendicontazioni)}
          filename={`Rendicontazioni_${filterMese || 'Tutti'}_${filterAnno || new Date().getFullYear()}`}
          sheetName="Rendicontazioni"
          buttonText="Esporta Rendicontazioni"
          filterOptions={{
            years: getUniqueAnni(),
            months: getUniqueMesi()
          }}
        />
      </div>
      
      {showFilters && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="filterMese" className="block text-sm font-medium text-gray-700 mb-1">
                Filtra per mese
              </label>
              <select
                id="filterMese"
                value={filterMese}
                onChange={(e) => setFilterMese(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti i mesi</option>
                {getUniqueMesi().map(mese => (
                  <option key={mese} value={mese}>{mese}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="filterAnno" className="block text-sm font-medium text-gray-700 mb-1">
                Filtra per anno
              </label>
              <select
                id="filterAnno"
                value={filterAnno}
                onChange={(e) => setFilterAnno(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti gli anni</option>
                {getUniqueAnni().map(anno => (
                  <option key={anno} value={anno}>{anno}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="filterPartner" className="block text-sm font-medium text-gray-700 mb-1">
                Filtra per partner
              </label>
              <select
                id="filterPartner"
                value={filterPartner}
                onChange={(e) => setFilterPartner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti i partner</option>
                {getUniquePartners().map(partner => (
                  <option key={partner} value={partner}>{partner}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="filterStato" className="block text-sm font-medium text-gray-700 mb-1">
                Filtra per stato
              </label>
              <select
                id="filterStato"
                value={filterStato}
                onChange={(e) => setFilterStato(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tutti gli stati</option>
                <option value="Da fatturare">Da fatturare</option>
                <option value="Fatturato">Fatturato</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reimposta filtri
            </button>
          </div>
        </div>
      )}
      
      {deleteError && (
        <div className="m-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {deleteError}
        </div>
      )}
      
      {rendicontazioni.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">Nessuna rendicontazione trovata.</p>
        </div>
      ) : filteredRendicontazioni.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Nessuna rendicontazione corrisponde ai filtri selezionati.</p>
          <button
            onClick={resetFilters}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Reimposta filtri
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periodo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner/Tecnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cedolini
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fascia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trasferte
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fattura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Servizio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredRendicontazioni.map((rendicontazione) => {
                const trasfertaInfo = formatTrasfertaInfo(
                  rendicontazione.numero_trasferte,
                  rendicontazione.totale_trasferta
                );
                
                return (
                  <tr key={rendicontazione.id} className={`hover:bg-gray-50 ${trasfertaInfo.hasTrasferte ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rendicontazione.mese} {rendicontazione.anno}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rendicontazione.nome_cliente}</div>
                      <div className="text-xs text-gray-500">Cod: {rendicontazione.codice_cliente}</div>
                      {rendicontazione.numero_commessa && (
                        <div className="text-xs text-gray-500">Commessa: {rendicontazione.numero_commessa}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{rendicontazione.partner}</div>
                      <div className="text-xs text-gray-500">Tecnico: {rendicontazione.nome_tecnico}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{rendicontazione.totale_cedolini}</div>
                      {rendicontazione.numero_cedolini_extra > 0 && (
                        <div className="text-xs text-gray-500">
                          Base: {rendicontazione.numero_cedolini} + Extra: {rendicontazione.numero_cedolini_extra}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">Fascia {rendicontazione.fascia}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(rendicontazione.importo)}</div>
                      {trasfertaInfo.hasTrasferte && (
                        <div className="text-xs text-gray-500">
                          Totale con trasferte: {formatCurrency(rendicontazione.importo + (trasfertaInfo.totale || 0))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className={`text-sm ${trasfertaInfo.hasTrasferte ? 'font-medium text-gray-900' : 'text-gray-500'}`}
                        title={trasfertaInfo.tooltip}
                      >
                        <div className="flex items-center">
                          <Car className={`w-4 h-4 mr-1 ${trasfertaInfo.hasTrasferte ? 'text-blue-500' : 'text-gray-400'}`} />
                          {trasfertaInfo.text}
                        </div>
                        {trasfertaInfo.hasTrasferte && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatCurrency(trasfertaInfo.totale || 0)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rendicontazione.stato === 'Fatturato' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {rendicontazione.stato || 'Da fatturare'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {rendicontazione.numero_fattura ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rendicontazione.numero_fattura}/{rendicontazione.anno_fattura}</div>
                          {rendicontazione.data_fattura && (
                            <div className="text-xs text-gray-500">
                              Data: {new Date(rendicontazione.data_fattura).toLocaleDateString('it-IT')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Non fatturato</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {rendicontazione.tipo_servizio?.descrizione || 'N/D'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cod: {rendicontazione.tipo_servizio?.codice_servizio || 'N/D'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(rendicontazione)}
                            //onEditRendicontazione(rendicontazione)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifica rendicontazione"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {deleteConfirmation === rendicontazione.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDelete(rendicontazione.id)}
                              disabled={deletingId === rendicontazione.id}
                              className="text-red-600 hover:text-red-800 text-xs font-bold"
                            >
                              {deletingId === rendicontazione.id ? (
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
                            onClick={() => setDeleteConfirmation(rendicontazione.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Elimina rendicontazione"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RendicontazioneList;