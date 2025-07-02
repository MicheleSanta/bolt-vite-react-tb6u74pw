import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserCheck, UserX, AlertCircle, Check, RefreshCw, Loader2, Users } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  nome: string | null;
  telefono: string | null;
  note: string | null;
  created_at: string;
}

interface Tecnico {
  id: number;
  nome: string;
}

const UserValidationManager: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [validating, setValidating] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
    fetchTecnici();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users_custom')
        .select('*')
        .eq('validato', false)
        .eq('attivo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError('Failed to fetch pending users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTecnici = async () => {
    try {
      const { data, error } = await supabase
        .from('tecnico')
        .select('*')
        .eq('attivo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      setTecnici(data || []);
    } catch (err) {
      console.error('Error fetching tecnici:', err);
    }
  };

  const handleValidate = async (userId: string, role: string, tecnicoId?: number) => {
    setValidating(userId);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.rpc('validate_user', {
        p_user_id: userId,
        p_role: role,
        p_tecnico_id: tecnicoId || null,
        p_note: null
      });

      if (error) throw error;

      setSuccess('Utente validato con successo');
      fetchPendingUsers();
    } catch (err) {
      console.error('Error validating user:', err);
      setError('Failed to validate user');
    } finally {
      setValidating(null);
    }
  };

  const handleReject = async (userId: string, motivo: string) => {
    setRejecting(userId);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.rpc('reject_user', {
        p_user_id: userId,
        p_motivo: motivo
      });

      if (error) throw error;

      setSuccess('Utente rifiutato con successo');
      fetchPendingUsers();
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError('Failed to reject user');
    } finally {
      setRejecting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Caricamento utenti in attesa...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Validazione Nuovi Utenti</h2>
        <button 
          onClick={fetchPendingUsers} 
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Aggiorna
        </button>
      </div>

      {error && (
        <div className="m-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="m-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <div className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">Nessun utente in attesa di validazione.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Registrazione
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tecnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motivo Rifiuto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.nome || 'N/D'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.telefono && (
                      <div className="text-xs text-gray-500">Tel: {user.telefono}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="text-sm border border-gray-300 rounded-md p-1"
                      defaultValue=""
                      onChange={(e) => {
                        const role = e.target.value;
                        if (role) {
                          handleValidate(user.id, role);
                        }
                      }}
                      disabled={validating === user.id || rejecting === user.id}
                    >
                      <option value="" disabled>Seleziona ruolo</option>
                      <option value="user">Utente</option>
                      <option value="employee">Dipendente</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="text-sm border border-gray-300 rounded-md p-1"
                      defaultValue=""
                      onChange={(e) => {
                        const tecnicoId = parseInt(e.target.value);
                        if (tecnicoId) {
                          handleValidate(user.id, 'employee', tecnicoId);
                        }
                      }}
                      disabled={validating === user.id || rejecting === user.id}
                    >
                      <option value="" disabled>Seleziona tecnico</option>
                      {tecnici.map(tecnico => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      className="text-sm border border-gray-300 rounded-md p-1 w-full"
                      placeholder="Motivo rifiuto..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          handleReject(user.id, target.value);
                        }
                      }}
                      disabled={validating === user.id || rejecting === user.id}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleValidate(user.id, 'user')}
                        disabled={validating === user.id || rejecting === user.id}
                        className="text-green-600 hover:text-green-800"
                        title="Valida utente"
                      >
                        {validating === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <UserCheck className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const motivo = prompt('Inserisci il motivo del rifiuto:');
                          if (motivo) {
                            handleReject(user.id, motivo);
                          }
                        }}
                        disabled={validating === user.id || rejecting === user.id}
                        className="text-red-600 hover:text-red-800"
                        title="Rifiuta utente"
                      >
                        {rejecting === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <UserX className="w-5 h-5" />
                        )}
                      </button>
                    </div>
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

export default UserValidationManager;