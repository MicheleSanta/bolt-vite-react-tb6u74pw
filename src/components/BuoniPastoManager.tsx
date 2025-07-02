import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Users, FileText, Check, X, Download, Filter, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import SearchBar from './SearchBar';
import ExcelExport from './ExcelExport';

interface BuonoPasto {
  id: string;
  data: string;
  user_id: string;
  tecnico_id: number;
  tipo_presenza: 'presenza_sede' | 'trasferta' | 'smart_working' | 'assenza';
  diritto_buono: boolean;
  note?: string;
  created_at: string;
  user?: {
    email: string;
    users_custom?: Array<{
      nome?: string;
      tecnico?: {
        id: number;
        nome: string;
      };
    }>;
  };
  tecnico?: {
    id: number;
    nome: string;
  };
}

interface BuonoPastoFormData {
  data_inizio: string;
  data_fine: string;
  tecnico_id: number;
  tipo_presenza: 'presenza_sede' | 'trasferta' | 'smart_working' | 'assenza';
  note?: string;
  giorni_settimana: number[];
}

interface Tecnico {
  id: number;
  nome: string;
  user_id?: string;
}

const BuoniPastoManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [buoni, setBuoni] = useState<BuonoPasto[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [formData, setFormData] = useState<BuonoPastoFormData>({
    data_inizio: new Date().toISOString().split('T')[0],
    data_fine: new Date().toISOString().split('T')[0],
    tecnico_id: 0,
    tipo_presenza: 'presenza_sede',
    note: '',
    giorni_settimana: [1, 2, 3, 4, 5]
  });
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().split('-').slice(0, 2).join('-'));
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTecnici();
    fetchBuoni();
  }, [filterMonth]);

  const fetchTecnici = async () => {
    try {
      const { data, error } = await supabase
        .from('tecnico')
        .select(`
          id,
          nome,
          users_custom!tecnico_id(
            id
          )
        `)
        .eq('attivo', true)
        .order('nome');
        
      if (error) throw error;
      
      const tecniciWithUsers = data?.map(tecnico => ({
        id: tecnico.id,
        nome: tecnico.nome,
        user_id: tecnico.users_custom?.[0]?.id
      })) || [];

      setTecnici(tecniciWithUsers);
      if (tecniciWithUsers.length > 0 && !formData.tecnico_id) {
        const firstTecnico = tecniciWithUsers[0];
        setFormData(prev => ({ ...prev, tecnico_id: firstTecnico.id }));
      }
    } catch (err) {
      console.error('Error fetching tecnici:', err);
      setError('Errore nel caricamento dei tecnici');
    }
  };

  const fetchBuoni = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = `${filterMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('buoni_pasto')
        .select(`
          *,
          user:user_id (
            email,
              nome,
              tecnico:tecnico_id (
                id,
                nome
              )
          ),
          tecnico:tecnico_id (
            id,
            nome
          )
        `)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false });
        
      if (error) throw error;
      
      setBuoni(data || []);
    } catch (err) {
      console.error('Error fetching buoni pasto:', err);
      setError('Errore nel caricamento dei buoni pasto');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const startDate = new Date(formData.data_inizio);
      const endDate = new Date(formData.data_fine);
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;

      if (!currentUserId) {
        throw new Error('Utente non autenticato');
      }

      const selectedTecnico = tecnici.find(t => t.id === formData.tecnico_id);
      if (!selectedTecnico?.user_id) {
        throw new Error('Tecnico non associato ad un utente');
      }

      const dates: string[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        if (formData.giorni_settimana.includes(adjustedDay)) {
          dates.push(currentDate.toISOString().split('T')[0]);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const { data: existingRecords, error: checkError } = await supabase
        .from('buoni_pasto')
        .select('data')
        .eq('user_id', selectedTecnico.user_id)
        .in('data', dates);

      if (checkError) throw checkError;

      const existingDates = new Set(existingRecords?.map(r => r.data));
      const newDates = dates.filter(date => !existingDates.has(date));

      if (newDates.length === 0) {
        throw new Error('Tutte le date selezionate hanno già una registrazione');
      }

      const { error: insertError } = await supabase
        .from('buoni_pasto')
        .insert(
          newDates.map(date => ({
            data: date,
            user_id: selectedTecnico.user_id,
            tipo_presenza: formData.tipo_presenza,
            note: formData.note,
            created_by: currentUserId,
            tecnico_id: selectedTecnico.id
          }))
        );

      if (insertError) throw insertError;

      setSuccess(`Registrati ${newDates.length} buoni pasto con successo`);
      setFormData(prev => ({
        ...prev,
        note: ''
      }));
      fetchBuoni();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('buoni_pasto')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchBuoni();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'eliminazione');
    }
  };

  const handleWeekdayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      giorni_settimana: prev.giorni_settimana.includes(day)
        ? prev.giorni_settimana.filter(d => d !== day)
        : [...prev.giorni_settimana, day].sort()
    }));
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

  const filteredBuoni = buoni.filter(buono => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const tecnicoNome = buono.tecnico?.nome || buono.user?.users_custom?.[0]?.tecnico?.nome || '';
    return (
      tecnicoNome.toLowerCase().includes(query) ||
      (buono.note || '').toLowerCase().includes(query)
    );
  });

  const prepareExportData = () => {
    return filteredBuoni.map(buono => ({
      Data: new Date(buono.data).toLocaleDateString('it-IT'),
      Tecnico: buono.tecnico?.nome || buono.user?.users_custom?.[0]?.tecnico?.nome || 'N/D',
      'Tipo Presenza': getTipoPresenzaLabel(buono.tipo_presenza),
      'Diritto Buono': buono.diritto_buono ? 'Sì' : 'No',
      Note: buono.note || ''
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Registrazione Buoni Pasto</h2>
        
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="data_inizio" className="block text-sm font-medium text-gray-700 mb-1">
                Data Inizio *
              </label>
              <input
                type="date"
                id="data_inizio"
                name="data_inizio"
                value={formData.data_inizio}
                onChange={(e) => setFormData(prev => ({ ...prev, data_inizio: e.target.value }))}
                required
                max={formData.data_fine}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="data_fine" className="block text-sm font-medium text-gray-700 mb-1">
                Data Fine *
              </label>
              <input
                type="date"
                id="data_fine"
                name="data_fine"
                value={formData.data_fine}
                onChange={(e) => setFormData(prev => ({ ...prev, data_fine: e.target.value }))}
                required
                min={formData.data_inizio}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="tecnico_id" className="block text-sm font-medium text-gray-700 mb-1">
                Tecnico *
              </label>
              <select
                id="tecnico_id"
                name="tecnico_id"
                value={formData.tecnico_id}
                onChange={(e) => setFormData(prev => ({ ...prev, tecnico_id: parseInt(e.target.value) }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona tecnico</option>
                {tecnici.map(tecnico => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tipo_presenza" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Presenza *
              </label>
              <select
                id="tipo_presenza"
                name="tipo_presenza"
                value={formData.tipo_presenza}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tipo_presenza: e.target.value as BuonoPastoFormData['tipo_presenza']
                }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="presenza_sede">Presenza in sede</option>
                <option value="trasferta">Trasferta</option>
                <option value="smart_working">Smart working/Telelavoro</option>
                <option value="assenza">Permesso/Assenza</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giorni della Settimana *
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { day: 1, label: 'Lun' },
                  { day: 2, label: 'Mar' },
                  { day: 3, label: 'Mer' },
                  { day: 4, label: 'Gio' },
                  { day: 5, label: 'Ven' },
                  { day: 6, label: 'Sab' },
                  { day: 7, label: 'Dom' }
                ].map(({ day, label }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleWeekdayToggle(day)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      formData.giorni_settimana.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Note (max 200 caratteri)
              </label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salva
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Buoni Pasto Registrati</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <Filter className="w-4 h-4 mr-1" />
              {showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
            </button>
            <button
              onClick={fetchBuoni}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Aggiorna
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700 mb-1">
                  Mese
                </label>
                <input
                  type="month"
                  id="filterMonth"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Cerca
                </label>
                <SearchBar
                  placeholder="Cerca per tecnico o note..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              <div className="flex items-end">
                <ExcelExport
                  data={prepareExportData()}
                  filename={`Buoni_Pasto_${filterMonth}`}
                  buttonText="Esporta"
                />
              </div>
            </div>
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
                  Tecnico
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBuoni.map((buono) => (
                <tr key={buono.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(buono.data).toLocaleDateString('it-IT')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {buono.tecnico?.nome || buono.user?.users_custom?.[0]?.tecnico?.nome || 'N/D'}
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
                    <div className="text-sm text-gray-900">{buono.note || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(buono.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
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

export default BuoniPastoManager;