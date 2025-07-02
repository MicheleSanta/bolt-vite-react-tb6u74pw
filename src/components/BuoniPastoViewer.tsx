import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, FileText } from 'lucide-react';

interface BuonoPasto {
  id: string;
  data: string;
  tipo_presenza: string;
  diritto_buono: boolean;
  note?: string;
}

const BuoniPastoViewer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buoni, setBuoni] = useState<BuonoPasto[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().split('-').slice(0, 2).join('-'));
  const [totaleBuoni, setTotaleBuoni] = useState(0);

  useEffect(() => {
    fetchBuoni();
  }, [filterMonth]);

  const fetchBuoni = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      const startDate = `${filterMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('buoni_pasto')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false });
        
      if (error) throw error;
      
      setBuoni(data || []);
      setTotaleBuoni((data || []).filter(b => b.diritto_buono).length);
    } catch (err) {
      console.error('Error fetching buoni pasto:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei buoni pasto');
    } finally {
      setLoading(false);
    }
  };

  const getTipoPresenzaLabel = (tipo: string) => {
    switch (tipo) {
      case 'presenza_sede': return 'Presenza in sede';
      case 'trasferta': return 'Trasferta';
      case 'smart_working': return 'Smart working';
      case 'assenza': return 'Assenza';
      default: return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Caricamento buoni pasto...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            I Miei Buoni Pasto
          </h2>
          <div className="flex items-center space-x-4">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="bg-blue-50 px-4 py-2 rounded-md">
              <span className="text-sm text-blue-700 font-medium">
                Totale buoni maturati: {totaleBuoni}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Presenza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diritto Buono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {buoni.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Nessun buono pasto registrato per questo mese
                  </td>
                </tr>
              ) : (
                buoni.map((buono) => (
                  <tr key={buono.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(buono.data).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getTipoPresenzaLabel(buono.tipo_presenza)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        buono.diritto_buono
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {buono.diritto_buono ? 'Sì' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {buono.note || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BuoniPastoViewer;