import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Rendicontazione } from '../types/database.types';
import { Loader2, RefreshCw, FileText, Edit, Trash2, AlertCircle, Filter, X, Receipt, CheckCircle, Car, Settings } from 'lucide-react';
import SearchBar from './SearchBar';
import ExcelExport from './ExcelExport';
import AdvancedFunctions from './AdvancedFunctions';

interface RendicontazioneListProps {
  refreshTrigger: number;
  onEditRendicontazione: (rendicontazione: Rendicontazione) => void;
}

const monthOrder: Record<string, number> = {
  'Gennaio': 1, 'Febbraio': 2, 'Marzo': 3, 'Aprile': 4, 'Maggio': 5, 'Giugno': 6,
  'Luglio': 7, 'Agosto': 8, 'Settembre': 9, 'Ottobre': 10, 'Novembre': 11, 'Dicembre': 12
};

const RendicontazioneListFatture: React.FC<RendicontazioneListProps> = ({ 
  refreshTrigger, 
  onEditRendicontazione 
}) => {
  const [rendicontazioni, setRendicontazioni] = useState<Rendicontazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMese, setFilterMese] = useState<string>('');
  const [filterAnno, setFilterAnno] = useState<number | ''>('');
  const [filterStato, setFilterStato] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showAdvancedFunctions, setShowAdvancedFunctions] = useState(false);

  useEffect(() => {
    fetchRendicontazioni();
  }, [refreshTrigger]);

  const fetchRendicontazioni = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('rendicontazione')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Sort by year (descending) and month (chronological)
      const sortedData = [...(data || [])].sort((a, b) => {
        if (a.anno !== b.anno) {
          return b.anno - a.anno;
        }
        return monthOrder[a.mese] - monthOrder[b.mese];
      });
      
      setRendicontazioni(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle rendicontazioni');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = rendicontazioni.filter(rendicontazione =>
    (!filterMese || rendicontazione.mese === filterMese) &&
    (!filterAnno || rendicontazione.anno === filterAnno) &&
    (!filterStato || rendicontazione.stato === filterStato) &&
    (searchQuery.trim() === '' ||
      rendicontazione.nome_cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rendicontazione.codice_cliente.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(filteredData.map(r => r.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleAdvancedFunctionsSuccess = () => {
    setShowAdvancedFunctions(false);
    setSelectedItems([]);
    fetchRendicontazioni();
  };

  const resetFilters = () => {
    setFilterMese('');
    setFilterAnno('');
    setFilterStato('');
    setSearchQuery('');
  };

  const getUniqueMesi = () => {
    return [...new Set(rendicontazioni.map(r => r.mese))].sort((a, b) => monthOrder[a] - monthOrder[b]);
  };

  const getUniqueAnni = () => {
    return [...new Set(rendicontazioni.map(r => r.anno))].sort((a, b) => b - a);
  };

  if (showAdvancedFunctions) {
    return (
      <AdvancedFunctions
        selectedIds={selectedItems}
        onSuccess={handleAdvancedFunctionsSuccess}
        onCancel={() => setShowAdvancedFunctions(false)}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-xl font-semibold">Gestione Fatturazione</h2>
        <div className="flex space-x-2">
          {selectedItems.length > 0 && (
            <button
              onClick={() => setShowAdvancedFunctions(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Funzioni Avanzate ({selectedItems.length})
            </button>
          )}
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

      <div className="p-4">
        <SearchBar 
          placeholder="Cerca per cliente, codice..." 
          value={searchQuery}
          onChange={setSearchQuery}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              >
                <option value="">Tutti gli anni</option>
                {getUniqueAnni().map(anno => (
                  <option key={anno} value={anno}>{anno}</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              >
                <option value="">Tutti gli stati</option>
                <option value="Da fatturare">Da fatturare</option>
                <option value="Fatturato">Fatturato</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Reimposta filtri
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="m-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Caricamento...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Periodo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Importo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Stato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Fattura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredData.map(rendicontazione => (
                <tr key={rendicontazione.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(rendicontazione.id)}
                      onChange={() => handleSelectItem(rendicontazione.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {rendicontazione.mese} {rendicontazione.anno}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {rendicontazione.nome_cliente}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cod: {rendicontazione.codice_cliente}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      € {rendicontazione.importo.toFixed(2)}
                    </div>
                    {rendicontazione.totale_trasferta && rendicontazione.totale_trasferta > 0 && (
                      <div className="text-xs text-gray-500 flex items-center">
                        <Car className="w-3 h-3 mr-1" />
                        Trasferte: € {rendicontazione.totale_trasferta.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rendicontazione.stato === 'Fatturato' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rendicontazione.stato}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {rendicontazione.numero_fattura ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {rendicontazione.numero_fattura}/{rendicontazione.anno_fattura}
                        </div>
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
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onEditRendicontazione(rendicontazione)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Modifica rendicontazione"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RendicontazioneListFatture;