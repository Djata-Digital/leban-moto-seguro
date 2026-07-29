import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { socket } from '../api/socket';

export type LiveMotorcycle = {
  motorcycleId: string;
  plateNumber: string;
  brand: string;
  model?: string;
  color?: string;
  type: string;
  status: string;
  ownerName: string;
  mapStatus: string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery?: number;
  ignitionOn?: boolean;
  recordedAt: string;
};

export function useLiveGps() {
  const [motorcycles, setMotorcycles] = useState<LiveMotorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  async function loadMotorcycles() {
    try {
      const response = await api.get('/dashboard/security-map');
      setMotorcycles(response.data.data);
      setLastUpdate(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMotorcycles();

    function handleGpsUpdate() {
      loadMotorcycles();
    }

    socket.on('gps.location.created', handleGpsUpdate);
    socket.on('dashboard.updated', handleGpsUpdate);
    socket.on('alert.created', handleGpsUpdate);
    socket.on('alert.updated', handleGpsUpdate);

    return () => {
      socket.off('gps.location.created', handleGpsUpdate);
      socket.off('dashboard.updated', handleGpsUpdate);
      socket.off('alert.created', handleGpsUpdate);
      socket.off('alert.updated', handleGpsUpdate);
    };
  }, []);

  return {
    motorcycles,
    loading,
    lastUpdate,
    reload: loadMotorcycles,
  };
}