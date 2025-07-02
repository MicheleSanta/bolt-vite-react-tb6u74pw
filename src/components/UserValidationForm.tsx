import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import UserValidationManager from './UserValidationManager';
import UserManager from './UserManager';
import { Shield, Users, UserCheck, Settings } from 'lucide-react';

const UserValidationForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'validation' | 'management'>('validation');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: customUser } = await supabase
          .from('users_custom')
          .select('role')
          .eq('id', user.id)
          .single();
          
        setIsAdmin(customUser?.role === 'admin');
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">
            Non hai i permessi necessari per accedere a questa sezione.
            Solo gli amministratori possono gestire gli utenti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-4 py-2 font-medium flex items-center ${
                activeTab === 'validation'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Validazione
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`px-4 py-2 font-medium flex items-center ${
                activeTab === 'management'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Gestione
            </button>
          </div>

          <div className="mt-4">
            {activeTab === 'validation' ? (
              <UserValidationManager />
            ) : (
              <UserManager />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserValidationForm;