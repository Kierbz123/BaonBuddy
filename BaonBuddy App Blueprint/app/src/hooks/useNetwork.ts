import { useState, useEffect, useCallback } from 'react';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', () => {});
      }
    };
  }, []);

  const checkOnline = useCallback(async (): Promise<boolean> => {
    // For an offline-first app, we just check device connectivity, not the specific backend.
    const online = navigator.onLine;
    setIsOnline(online);
    return online;
  }, []);

  return {
    isOnline,
    connectionType,
    checkOnline,
  };
}

export default useNetwork;
