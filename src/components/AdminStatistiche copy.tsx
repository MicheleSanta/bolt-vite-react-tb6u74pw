import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Users, FileText, Calculator, Car, Trophy, Search } from 'lucide-react';
import SearchBar from './SearchBar';

interface TecnicoStats {
  id: number;
  nome: string;
  totaleCedolini: number;
  totaleCedoliniExtra: number;
  totaleTrasferte: number;
  importoTotale: number;
  importoTrasferte: number;
  clientiUnici: number;
  servizi: {
    [key: string]: {
      count: number;
      cedolini: number;
      importo: number;
    }
  };
  performanceMensile: {
    [key: string]: {
      cedolini: number;
      importo: number;
      trasferte: number;
    }
  };
}

interface TecnicoPerformance {
  nome: string;
  punteggio: number;
  cedolini: number;
  importo: number;
  clienti: number;
}

const monthOrder = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

const AdminStatistiche: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tecnici, setTecnici] = useState<{ id: number; nome: string }[]>([]);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<number | null>(null);
  const [tecnicoStats, setTecnicoStats] = useState<TecnicoStats | null>(null);
  const [periodoFiltro, setPeriodoFiltro] = useState<'mese' | 'anno' | 'tutto'>('mese');
  const [annoFiltro, setAnnoFiltro] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [classifica, setClassifica] = useState<TecnicoPerformance[]>([]);

  useEffect(() => {
    fetchTecnici();
    fetchClassifica();
  }, []);

  useEffect(() => {
    if (selectedTecnicoId) {
      fetchTecnicoStats();
    }
  }, [selectedTecnicoId, periodoFiltro, annoFiltro]);

  const fetchTecnici = async () => {
    try {
      const { data, error } = await supabase
        .from('tecnico')
        .select('id, nome')
        .eq('attivo', true)
        .order('nome');
        
      if (error) throw error;
      
      setTecnici(data || []);
      if (data && data.length > 0) {
        setSelectedTecnicoId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching tecnici:', err);
      setError('Errore nel caricamento dei tecnici');
    }
  };

  const fetchClassifica = async () => {
    try {
      const { data: rendicontazioni, error: rendicontazioniError } = await supabase
        .from('rendicontazione')
        .select(`
          nome_tecnico,
          numero_cedolini,
          numero_cedolini_extra,
          importo,
          codice_cliente,
          totale_trasferta
        `);

      if (rendicontazioniError) throw rendicontazioniError;

      // Aggregate data by tecnico
      const tecnicoStats = new Map<string, TecnicoPerformance>();
      
      rendicontazioni?.forEach(r => {
        if (!tecnicoStats.has(r.nome_tecnico)) {
          tecnicoStats.set(r.nome_tecnico, {
            nome: r.nome_tecnico,
            punteggio: 0,
            cedolini: 0,
            importo: 0,
            clienti: new Set().size
          });
        }

        const stats = tecnicoStats.get(r.nome_tecnico)!;
        const cedoliniTotali = r.numero_cedolini + (r.numero_cedolini_extra || 0);
        const importoTotale = r.importo + (r.totale_trasferta || 0);

        stats.cedolini += cedoliniTotali;
        stats.importo += importoTotale;
        stats.clienti = new Set([...Array.from(new Set([stats.clienti])), r.codice_cliente]).size;

        // Calculate performance score
        // Formula: (cedolini * 0.4) + (importo/1000 * 0.4) + (clienti * 0.2)
        stats.punteggio = (
          (cedoliniTotali * 0.4) + 
          ((importoTotale/1000) * 0.4) + 
          (stats.clienti * 0.2)
        );

        tecnicoStats.set(r.nome_tecnico, stats);
      });

      // Convert to array and sort by score
      const classificaArray = Array.from(tecnicoStats.values())
        .sort((a, b) => b.punteggio - a.punteggio);

      setClassifica(classificaArray);
    } catch (err) {
      console.error('Error fetching classifica:', err);
      setError('Errore nel caricamento della classifica');
    }
  };

  const fetchTecnicoStats = async () => {
    if (!selectedTecnicoId) return;

    setLoading(true);
    setError(null);

    try {
      // Get tecnico name
      const { data: tecnicoData, error: tecnicoError } = await supabase
        .from('tecnico')
        .select('nome')
        .eq('id', selectedTecnicoId)
        .single();

      if (tecnicoError) throw tecnicoError;

      // Build query based on filter
      let query = supabase
        .from('rendicontazione')
        .select(`
          *,
          tipo_servizio (
            id,
            codice_servizio,
            descrizione
          ),
          trasferte:rendicontazione_trasferte(*)
        `)
        .eq('nome_tecnico', tecnicoData.nome);

      if (periodoFiltro === 'mese') {
        const currentDate = new Date();
        query = query
          .eq('anno', currentDate.getFullYear())
          .eq('mese', currentDate.toLocaleString('it-IT', { month: 'long' }));
      } else if (periodoFiltro === 'anno') {
        query = query.eq('anno', annoFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data
      const stats: TecnicoStats = {
        id: selectedTecnicoId,
        nome: tecnicoData.nome,
        totaleCedolini: 0,
        totaleCedoliniExtra: 0,
        totaleTrasferte: 0,
        importoTotale: 0,
        importoTrasferte: 0,
        clientiUnici: new Set(data?.map(r => r.codice_cliente)).size,
        servizi: {},
        performanceMensile: {}
      };

      data?.forEach(record => {
        // Aggregate totals
        stats.totaleCedolini += record.numero_cedolini;
        stats.totaleCedoliniExtra += record.numero_cedolini_extra;
        stats.totaleTrasferte += record.numero_trasferte || 0;
        stats.importoTotale += record.importo;
        stats.importoTrasferte += record.totale_trasferta || 0;

        // Aggregate by service type
        const serviceName = record.tipo_servizio?.descrizione || 'Non specificato';
        if (!stats.servizi[serviceName]) {
          stats.servizi[serviceName] = {
            count: 0,
            cedolini: 0,
            importo: 0
          };
        }
        stats.servizi[serviceName].count++;
        stats.servizi[serviceName].cedolini += record.totale_cedolini;
        stats.servizi[serviceName].importo += record.importo;

        // Aggregate by month
        const periodo = `${record.mese} ${record.anno}`;
        if (!stats.performanceMensile[periodo]) {
          stats.performanceMensile[periodo] = {
            cedolini: 0,
            importo: 0,
            trasferte: 0
          };
        }
        stats.performanceMensile[periodo].cedolini += record.totale_cedolini;
        stats.performanceMensile[periodo].importo += record.importo;
        stats.performanceMensile[periodo].trasferte += record.totale_trasferta || 0;
      });

      setTecnicoStats(stats);
    } catch (err) {
      console.error('Error fetching tecnico stats:', err);
      setError('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (loading && !tecnicoStats) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Caricamento statistiche...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classifica Tecnici */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
          Classifica Performance Tecnici
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posizione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tecnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cedolini
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clienti
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Punteggio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classifica.map((tecnico, index) => (
                <tr key={tecnico.nome} className={`hover:bg-gray-50 ${index === 0 ? 'bg-yellow-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {index + 1}º
                      {index === 0 && <span className="ml-2">🏆</span>}
                      {index === 1 && <span className="ml-2">🥈</span>}
                      {index === 2 && <span className="ml-2">🥉</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tecnico.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tecnico.cedolini}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(tecnico.importo)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tecnico.clienti}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {tecnico.punteggio.toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
        <div>
          <label htmlFor="tecnicoSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Seleziona Tecnico
          </label>
          <select
            id="tecnicoSelect"
            value={selectedTecnicoId || ''}
            onChange={(e) => setSelectedTecnicoId(parseInt(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {tecnici.map(tecnico => (
              <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="periodoFiltro" className="block text-sm font-medium text-gray-700 mb-1">
            Periodo
          </label>
          <select
            id="periodoFiltro"
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value as 'mese' | 'anno' | 'tutto')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="mese">Mese corrente</option>
            <option value="anno">Anno</option>
            <option value="tutto">Tutto</option>
          </select>
        </div>

        {periodoFiltro === 'anno' && (
          <div>
            <label htmlFor="annoFiltro" className="block text-sm font-medium text-gray-700 mb-1">
              Anno
            </label>
            <select
              id="annoFiltro"
              value={annoFiltro}
              onChange={(e) => setAnnoFiltro(parseInt(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tecnicoStats && (
        <>
          {/* Statistiche generali */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cedolini Elaborati</p>
                  <p className="text-2xl font-semibold">{tecnicoStats.totaleCedolini}</p>
                  {tecnicoStats.totaleCedoliniExtra > 0 && (
                    <p className="text-xs text-gray-500">+{tecnicoStats.totaleCedoliniExtra} extra</p>
                  )}
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Trasferte</p>
                  <p className="text-2xl font-semibold">{tecnicoStats.totaleTrasferte}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(tecnicoStats.importoTrasferte)}</p>
                </div>
                <Car className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Importo Totale</p>
                  <p className="text-2xl font-semibold">{formatCurrency(tecnicoStats.importoTotale)}</p>
                  <p className="text-xs text-gray-500">Incluse trasferte</p>
                </div>
                <Calculator className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Clienti Gestiti</p>
                  <p className="text-2xl font-semibold">{tecnicoStats.clientiUnici}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Statistiche per tipo servizio */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Performance per Tipo Servizio</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servizio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pratiche
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cedolini
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(tecnicoStats.servizi).map(([servizio, dati]) => (
                    <tr key={servizio} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {servizio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dati.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dati.cedolini}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(dati.importo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance mensile */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Performance Mensile</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periodo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cedolini
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trasferte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(tecnicoStats.performanceMensile)
                    .sort((a, b) => {
                      const [meseAnnoA] = a[0].split(' ');
                      const [meseAnnoB] = b[0].split(' ');
                      const monthOrderA = monthOrder.indexOf(meseAnnoA);
                      const monthOrderB = monthOrder.indexOf(meseAnnoB);
                      return monthOrderB - monthOrderA;
                    })
                    .map(([periodo, dati]) => (
                      <tr key={periodo} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {periodo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {dati.cedolini}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(dati.trasferte)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(dati.importo)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatistiche;