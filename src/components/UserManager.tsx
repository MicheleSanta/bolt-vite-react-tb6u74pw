import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shield, UserPlus, Loader2, AlertCircle, Check, X, Key, Mail, Phone, FileText, UserCheck, Save, Trash2, Power, Lock, Ban } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: string;
  nome: string | null;
  telefono: string | null;
  note: string | null;
  attivo: boolean;
  ultimo_accesso: string | null;
  created_at: string;
  validato: boolean;
  data_validazione: string | null;
  motivo_rifiuto: string | null;
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('users_custom')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (userToEdit) {
        setUserToEdit({ ...userToEdit, [name]: checked });
      }
    } else {
      if (userToEdit) {
        setUserToEdit({ ...userToEdit, [name]: value });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (userToEdit) {
        // Update user data
        const { error: updateError } = await supabase
          .from('users_custom')
          .update({
            role: userToEdit.role,
            nome: userToEdit.nome,
            telefono: userToEdit.telefono,
            note: userToEdit.note,
            attivo: userToEdit.attivo
          })
          .eq('id', userToEdit.id);
        
        if (updateError) throw updateError;
        
        setSuccess('Utente aggiornato con successo!');
        setUserToEdit(null);
        
        // Refresh the list
        fetchUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserData) => {
    setUserToEdit(user);
  };

  const handleCancelEdit = () => {
    setUserToEdit(null);
  };

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    setError(null);
    
    try {
      // First delete from users_custom
      const { error: customError } = await supabase
        .from('users_custom')
        .delete()
        .eq('id', userId);
        
      if (customError) throw customError;
      
      // Then delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) throw authError;
      
      setSuccess('Utente eliminato con successo!');
      setDeleteConfirmation(null);
      
      // Refresh the list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante l\'eliminazione');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setResettingPassword(userId);
    setError(null);
    
    try {
      const newPassword = prompt('Inserisci la nuova password (minimo 6 caratteri):');
      
      if (!newPassword) {
        throw new Error('Operazione annullata');
      }
      
      if (newPassword.length < 6) {
        throw new Error('La password deve essere di almeno 6 caratteri');
      }
      
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });
        
      if (error) throw error;
      
      setSuccess('Password reimpostata con successo!');
      
      // Refresh the list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante il reset della password');
    } finally {
      setResettingPassword(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setTogglingStatus(userId);
    setError(null);
    
    try {
      const note = prompt(`Inserisci una nota per ${currentStatus ? 'disattivare' : 'attivare'} l'utente:`);
      
      if (note === null) {
        throw new Error('Operazione annullata');
      }
      
      const { error } = await supabase
        .from('users_custom')
        .update({ 
          attivo: !currentStatus,
          note: note || null
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      setSuccess(`Utente ${currentStatus ? 'disattivato' : 'attivato'} con successo!`);
      
      // Refresh the list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante la modifica dello stato');
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleCancelUser = async (userId: string) => {
    setCanceling(userId);
    setError(null);
    
    try {
      const motivo = prompt('Inserisci il motivo della cancellazione:');
      
      if (motivo === null) {
        throw new Error('Operazione annullata');
      }
      
      const { error } = await supabase
        .from('users_custom')
        .update({
          validato: false,
          attivo: false,
          motivo_rifiuto: motivo
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      setSuccess('Utente cancellato con successo!');
      
      // Refresh the list
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore durante la cancellazione');
    } finally {
      setCanceling(null);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/D';
    try {
      return new Date(dateString).toLocaleString('it-IT');
    } catch (e) {
      return 'N/D';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Caricamento utenti...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Gestione Utenti</h2>
      
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
      
      {userToEdit && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={userToEdit.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Ruolo
              </label>
              <select
                id="role"
                name="role"
                value={userToEdit.role}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">Utente</option>
                <option value="employee">Dipendente</option>
                <option value="admin">Amministratore</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={userToEdit.nome || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={userToEdit.telefono || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                id="note"
                name="note"
                value={userToEdit.note || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="attivo"
                name="attivo"
                checked={userToEdit.attivo}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="attivo" className="ml-2 block text-sm text-gray-700">
                Utente attivo
              </label>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Aggiorna
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      <div className="border rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ruolo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contatti
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ultimo Accesso
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center py-4">
                    <User className="w-8 h-8 text-gray-300 mb-2" />
                    <p>Nessun utente trovato</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${!user.attivo ? 'bg-gray-50 text-gray-500' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.nome || 'N/D'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : user.role === 'employee'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'admin' ? 'Amministratore' : user.role === 'employee' ? 'Dipendente' : 'Utente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Phone className="w-4 h-4 mr-1 text-gray-400" />
                      {user.telefono || 'N/D'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.attivo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.attivo ? 'Attivo' : 'Inattivo'}
                      </span>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.validato 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.validato ? 'Validato' : 'Non validato'}
                      </span>
                      {user.motivo_rifiuto && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Rifiutato: {user.motivo_rifiuto}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(user.ultimo_accesso)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifica utente"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        disabled={resettingPassword === user.id}
                        className={`${
                          resettingPassword === user.id 
                            ? 'text-gray-400' 
                            : 'text-orange-600 hover:text-orange-800'
                        }`}
                        title="Reimposta password"
                      >
                        {resettingPassword === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.attivo)}
                        disabled={togglingStatus === user.id || user.role === 'admin'}
                        className={`${
                          togglingStatus === user.id || user.role === 'admin'
                            ? 'text-gray-400 cursor-not-allowed' 
                            : user.attivo
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={user.attivo ? 'Disattiva utente' : 'Attiva utente'}
                      >
                        {togglingStatus === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Power className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCancelUser(user.id)}
                        disabled={canceling === user.id || user.role === 'admin'}
                        className={`${
                          canceling === user.id || user.role === 'admin'
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-orange-600 hover:text-orange-800'
                        }`}
                        title="Cancella utente"
                      >
                        {canceling === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Ban className="w-5 h-5" />
                        )}
                      </button>
                      {user.role !== 'admin' && (
                        deleteConfirmation === user.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={deletingId === user.id}
                              className="text-red-600 hover:text-red-800 text-xs font-bold"
                            >
                              {deletingId === user.id ? (
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
                            onClick={() => setDeleteConfirmation(user.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Elimina utente"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )
                      )}
                    </div>
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

export default UserManager;