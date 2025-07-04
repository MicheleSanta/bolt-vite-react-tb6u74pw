import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { refreshConnection } from '../lib/supabase';

const ConnectionAlert: React.FC = () => {
  const { connectionLost } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Only show alert after the connection has been lost for 3 seconds
    // This prevents flickering for momentary connection issues
    let timeout: number | undefined = undefined;
    
    if (connectionLost) {
      timeout = window.setTimeout(() => {
        setShowAlert(true);
      }, 3000);
    } else {
      setShowAlert(false);
      setRetryCount(0);
    }
    
    return () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    };
  }, [connectionLost]);

  const handleManualRefresh = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      const success = await refreshConnection();
      if (!success && retryCount >= 3) {
        // After 3 manual retries, suggest page reload
        // This is a last resort for severe connection issues
        if (window.confirm('Problema di connessione persistente. Vuoi ricaricare la pagina?')) {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Manual reconnection failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!showAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50 max-w-sm animate-pulse">
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-2">
          <WifiOff className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">Connessione al database persa</p>
          <p className="text-xs">Tentativo di riconnessione in corso...</p>
        </div>
        <button 
          onClick={handleManualRefresh}
          disabled={isRetrying}
          className="ml-2 p-2 bg-white hover:bg-gray-50 text-red-500 rounded-md transition-colors"
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