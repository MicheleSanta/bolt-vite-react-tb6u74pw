import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileBarChart2, Calendar, Users, FileText, Calculator, Car, CheckCircle, Clock } from 'lucide-react';

interface StatisticheData {
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

// Define monthOrder if missing
const monthOrder = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DipendenteStatistiche: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatisticheData>({
    totaleCedolini: 0,
    totaleCedoliniExtra: 0,
    totaleTrasferte: 0,
    importoTotale: 0,
    importoTrasferte: 0,
    clientiUnici: 0,
    servizi: {},
    performanceMensile: {}
  });
  const [periodoFiltro, setPeriodoFiltro] = useState<'mese' | 'anno' | 'tutto'>('mese');
  const [annoFiltro, setAnnoFiltro] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchStatistiche();
  }, [periodoFiltro, annoFiltro]);

  const fetchStatistiche = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        throw new Error('User not authenticated');
      }

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
        .eq('user_id', user.id);

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
      const statistiche: StatisticheData = {
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
        statistiche.totaleCedolini += record.numero_cedolini;
        statistiche.totaleCedoliniExtra += record.numero_cedolini_extra;
        statistiche.totaleTrasferte += record.numero_trasferte || 0;
        statistiche.importoTotale += record.importo;
        statistiche.importoTrasferte += record.totale_trasferta || 0;

        // Aggregate by service type
        const serviceName = record.tipo_servizio?.descrizione || 'Non specificato';
        if (!statistiche.servizi[serviceName]) {
          statistiche.servizi[serviceName] = {
            count: 0,
            cedolini: 0,
            importo: 0
          };
        }
        statistiche.servizi[serviceName].count++;
        statistiche.servizi[serviceName].cedolini += record.totale_cedolini;
        statistiche.servizi[serviceName].importo += record.importo;

        // Aggregate by month
        const periodo = `${record.mese} ${record.anno}`;
        if (!statistiche.performanceMensile[periodo]) {
          statistiche.performanceMensile[periodo] = {
            cedolini: 0,
            importo: 0,
            trasferte: 0
          };
        }
        statistiche.performanceMensile[periodo].cedolini += record.totale_cedolini;
        statistiche.performanceMensile[periodo].importo += record.importo;
        statistiche.performanceMensile[periodo].trasferte += record.totale_trasferta || 0;
      });

      setStats(statistiche);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Caricamento statistiche...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
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

      {/* Statistiche generali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cedolini Elaborati</p>
              <p className="text-2xl font-semibold">{stats.totaleCedolini}</p>
              {stats.totaleCedoliniExtra > 0 && (
                <p className="text-xs text-gray-500">+{stats.totaleCedoliniExtra} extra</p>
              )}
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Trasferte</p>
              <p className="text-2xl font-semibold">{stats.totaleTrasferte}</p>
              <p className="text-xs text-gray-500">{formatCurrency(stats.importoTrasferte)}</p>
            </div>
            <Car className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Importo Totale</p>
              <p className="text-2xl font-semibold">{formatCurrency(stats.importoTotale)}</p>
              <p className="text-xs text-gray-500">Incluse trasferte</p>
            </div>
            <Calculator className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clienti Gestiti</p>
              <p className="text-2xl font-semibold">{stats.clientiUnici}</p>
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
              {Object.entries(stats.servizi).map(([servizio, dati]) => (
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
              {Object.entries(stats.performanceMensile)
                .sort((a, b) => {
                  const [meseAnnoA] = a[0].split(' ');
                  const [meseAnnoB] = b[0].split(' ');
                  const monthOrderA = monthOrder[meseAnnoA as keyof typeof monthOrder] || 0;
                  const monthOrderB = monthOrder[meseAnnoB as keyof typeof monthOrder] || 0;
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
    </div>
  );
};

export default DipendenteStatistiche;