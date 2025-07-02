import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Loader2, AlertCircle, Check, RefreshCw, Tag, Info } from 'lucide-react';

interface Version {
  id: number;
  versione: string;
  data_rilascio: string;
  note?: string;
  created_at: string;
}

const VersionManager: React.FC = () => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState({
    versione: '',
    data_rilascio: new Date().toISOString().split('T')[0],
    note: ''
  });

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('versione')
        .select('*')
        .order('data_rilascio', { ascending: false });
        
      if (error) throw error;
      
      setVersions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento delle versioni');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewVersion(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('versione')
        .insert([newVersion]);
      
      if (error) throw error;
      
      setSuccess('Nuova versione aggiunta con successo!');
      setNewVersion({
        versione: '',
        data_rilascio: new Date().toISOString().split('T')[0],
        note: ''
      });
      
      fetchVersions();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading && versions.length === 0) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Caricamento versioni...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Gestione Versioni</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="versione" className="block text-sm font-medium text-gray-700 mb-1">
              Numero Versione
            </label>
            <input
              type="text"
              id="versione"
              name="versione"
              value={newVersion.versione}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Es. 1.0.0"
            />
          </div>
          
          <div>
            <label htmlFor="data_rilascio" className="block text-sm font-medium text-gray-700 mb-1">
              Data Rilascio
            </label>
            <input
              type="date"
              id="data_rilascio"
              name="data_rilascio"
              value={newVersion.data_rilascio}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <input
              type="text"
              id="note"
              name="note"
              value={newVersion.note}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Note opzionali sulla versione"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Aggiungi Versione
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Cronologia Versioni</h3>
        <button 
          onClick={fetchVersions} 
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Aggiorna
        </button>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Versione
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Rilascio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Note
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {versions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Tag className="w-8 h-8 text-gray-300 mb-2" />
                    <p>Nessuna versione trovata</p>
                  </div>
                </td>
              </tr>
            ) : (
              versions.map((version, index) => (
                <tr key={version.id} className={`hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Tag className={`w-4 h-4 mr-2 ${index === 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {version.versione}
                          {index === 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Attuale
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(version.data_rilascio)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{version.note || '-'}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VersionManager;