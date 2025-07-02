import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { refreshConnection } from '../lib/supabase';

const ConnectionAlert: React.FC = () => {
  const { connectionLost } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Only show alert after the connection has been lost for 2 seconds
    // This prevents flickering for momentary connection issues
    let timeout: number | null = null;
    
    if (connectionLost) {
      timeout = window.setTimeout(() => {
        setShowAlert(true);
      }, 2000);
    } else {
      setShowAlert(false);
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [connectionLost]);

  const handleManualRefresh = async () => {
    setIsRetrying(true);
    try {
      await refreshConnection();
    } catch (err) {
      console.error('Manual reconnection failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!showAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50 max-w-sm">
      <div className="flex items-center">
        <WifiOff className="w-5 h-5 mr-2 text-red-500" />
        <div className="flex-1">
          <p className="font-bold text-sm">Connessione al database persa</p>
          <p className="text-xs">Tentativo di riconnessione in corso...</p>
        </div>
        <button 
          onClick={handleManualRefresh}
          disabled={isRetrying}
          className="ml-2 p-1.5 bg-white hover:bg-gray-50 text-red-500 rounded-full"
          title="Tenta riconnessione manuale"
        >
          {isRetrying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ConnectionAlert;