import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Info } from 'lucide-react';

interface Version {
  versione: string;
  data_rilascio: string;
  note?: string;
}

const VersionInfo: React.FC = () => {
  const [version, setVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestVersion();
  }, []);

  const fetchLatestVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('versione')
        .select('*')
        .order('data_rilascio', { ascending: false })
        .limit(1)
        .single();
        
      if (error) throw error;
      
      setVersion(data);
    } catch (err) {
      console.error('Error fetching version:', err);
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento della versione');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (error || !version) return null;

  return (
    <div className="text-xs text-gray-500 flex items-center">
      <Info className="w-3 h-3 mr-1" />
      <span>
        Versione {version.versione} - Rilasciata il {new Date(version.data_rilascio).toLocaleDateString('it-IT')}
        {version.note && (
          <span className="ml-1 text-gray-400">({version.note})</span>
        )}
      </span>
    </div>
  );
};

export default VersionInfo;