import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ConnectionAlert: React.FC = () => {
  const { connectionLost } = useAuth();

  if (!connectionLost) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50 flex items-center">
      <AlertTriangle className="w-5 h-5 mr-2" />
      <div>
        <p className="font-bold">Connessione al database persa</p>
        <p className="text-sm">Tentativo di riconnessione in corso...</p>
      </div>
      <Loader2 className="w-5 h-5 ml-3 animate-spin" />
    </div>
  );
};

export default ConnectionAlert;