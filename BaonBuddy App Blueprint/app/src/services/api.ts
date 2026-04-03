import type { 
  Transaction, TransactionCreate,
} from '@/types';

// --- API URL Resolution (for optional background sync) ---

const STORAGE_KEY_API_URL = 'baonbuddy_api_url';
const STORAGE_KEY_LAST_GOOD_IP = 'baonbuddy_last_good_ip';

function isCapacitorNative(): boolean {
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  if (cap?.getPlatform?.() === 'android' || cap?.getPlatform?.() === 'ios') return true;
  if (typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    return true;
  }
  return false;
}

function isBrowserDev(): boolean {
  try {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isMobileUA = /Android|iPhone|iPad/i.test(navigator.userAgent);
    return isLocalhost && !isMobileUA && !isCapacitorNative();
  } catch {
    return false;
  }
}

async function probeHost(ip: string, port: number = 8000, timeoutMs: number = 1500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`http://${ip}:${port}/health`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(timer);
    if (response.ok) {
      const data = await response.json().catch(() => null);
      return data?.status === 'healthy';
    }
    return false;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

async function discoverBackendIP(port: number = 8000): Promise<string | null> {
  const subnets = ['192.168.1', '192.168.0', '192.168.254', '10.0.0', '10.0.2', '10.0.3', '10.171.0', '172.16.0'];
  
  const priorityIPs = [
    '10.171.0.75',
    '10.0.2.2',
    '10.0.3.2',
    '192.168.1.1',
    '192.168.0.1',
  ];

  const lastGoodIP = localStorage.getItem(STORAGE_KEY_LAST_GOOD_IP);
  if (lastGoodIP) {
    const isAlive = await probeHost(lastGoodIP, port, 2000);
    if (isAlive) return lastGoodIP;
  }

  for (const ip of priorityIPs) {
    const isAlive = await probeHost(ip, port, 1500);
    if (isAlive) {
      localStorage.setItem(STORAGE_KEY_LAST_GOOD_IP, ip);
      return ip;
    }
  }

  const commonHostEndings = [2, 3, 4, 5, 10, 15, 20, 23, 25, 50, 75, 100, 101, 102, 103, 104, 105, 110, 150, 200];
  
  for (const subnet of subnets) {
    const probes = commonHostEndings.map(async (ending) => {
      const ip = `${subnet}.${ending}`;
      const alive = await probeHost(ip, port, 1200);
      return alive ? ip : null;
    });
    
    const results = await Promise.all(probes);
    const found = results.find(r => r !== null);
    if (found) {
      localStorage.setItem(STORAGE_KEY_LAST_GOOD_IP, found);
      return found;
    }
  }

  return null;
}

function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
  if (customUrl) return customUrl;

  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  if (isBrowserDev()) {
    return 'http://localhost:8000/api';
  }

  const lastGoodIP = localStorage.getItem(STORAGE_KEY_LAST_GOOD_IP);
  if (lastGoodIP) {
    return `http://${lastGoodIP}:8000/api`;
  }

  return 'http://localhost:8000/api';
}

let API_BASE_URL = getApiBaseUrl();

export async function initializeApiConnection(): Promise<{ connected: boolean; ip?: string }> {
  const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
  if (customUrl) {
    const baseUrl = customUrl.replace(/\/api\/?$/, '');
    try {
      const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
      if (res.ok) {
        API_BASE_URL = customUrl;
        return { connected: true };
      }
    } catch { /* fall through */ }
  }

  if (isBrowserDev()) {
    const alive = await probeHost('localhost', 8000, 3000);
    return { connected: alive, ip: 'localhost' };
  }

  const ip = await discoverBackendIP();
  if (ip) {
    API_BASE_URL = `http://${ip}:8000/api`;
    return { connected: true, ip };
  }

  return { connected: false };
}

// --- HTTP Client ---

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {},
  deviceId?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  if (deviceId) {
    headers['X-Device-ID'] = deviceId;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(response.status, error.detail || 'Request failed');
    }
    
    return response.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, `Sync connection failed: ${err.message}`);
  }
}

// --- Sync API Module (optional, used only for background sync) ---

export const SyncAPI = {
  async push(deviceId: string, transactions: TransactionCreate[], lastSync: string): Promise<{
    synced_count: number;
    transactions: Transaction[];
    sync_time: string;
  }> {
    return fetchApi('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ transactions, last_sync: lastSync, device_id: deviceId }),
    }, deviceId);
  },
  
  async pull(deviceId: string, lastSync: string): Promise<{
    transactions: Transaction[];
    last_sync: string;
    count: number;
  }> {
    return fetchApi(`/sync/pull?last_sync=${encodeURIComponent(lastSync)}&device_id=${deviceId}`, {}, deviceId);
  },
};

export default {
  Sync: SyncAPI,
};
