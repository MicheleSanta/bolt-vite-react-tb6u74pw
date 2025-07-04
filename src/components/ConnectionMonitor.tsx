import React, { useEffect, useState } from 'react';
import { supabase, addConnectionListener, removeConnectionListener } from '../lib/supabase';

interface ConnectionMonitorProps {
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  children?: React.ReactNode;
}

const ConnectionMonitor: React.FC<ConnectionMonitorProps> = ({
  onConnectionLost,
  onConnectionRestored,
  children
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    // Register connection listener
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      setLastCheck(Date.now());
      
      if (!connected && onConnectionLost) {
        onConnectionLost();
      } else if (connected && onConnectionRestored) {
        onConnectionRestored();
      }
    };

    addConnectionListener(handleConnectionChange);

    // Cleanup function
    return () => {
      removeConnectionListener(handleConnectionChange);
    };
  }, [onConnectionLost, onConnectionRestored]);

  // Force periodic connection checks even if heartbeat stalls
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const currentTime = Date.now();
      const timeSinceLastCheck = currentTime - lastCheck;
      
      // If it's been more than 30 seconds since the last check, force a check
      if (timeSinceLastCheck > 30000) {
        console.log('Forcing connection check due to inactivity');
        try {
          await supabase
            .from('versione')
            .select('id', { head: true, count: 'exact' })
            .limit(1);
          
          // If we get here, connection is working
          if (!isConnected) {
            setIsConnected(true);
            if (onConnectionRestored) {
              onConnectionRestored();
            }
          }
        } catch (error) {
          console.error('Forced connection check failed:', error);
          if (isConnected) {
            setIsConnected(false);
            if (onConnectionLost) {
              onConnectionLost();
            }
          }
        }
        
        setLastCheck(currentTime);
      }
    }, 10000); // Check every 10 seconds if needed

    return () => {
      clearInterval(intervalId);
    };
  }, [isConnected, lastCheck, onConnectionLost, onConnectionRestored]);

  return <>{children}</>;
};

export default ConnectionMonitor;