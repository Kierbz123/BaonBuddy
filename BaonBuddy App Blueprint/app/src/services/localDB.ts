import localforage from 'localforage';
import type { Wallet, Transaction, Category, Alert, AllowanceSettings, DailySnapshot } from '@/types';

localforage.config({
  name: 'BaonBuddy',
  storeName: 'app_data',
  version: 1.0,
});

const walletsStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'wallets',
});

const transactionsStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'transactions',
});

const categoriesStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'categories',
});

const alertsStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'alerts',
});

const metaStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'meta',
});

const authStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'auth',
});

const dailySnapshotsStore = localforage.createInstance({
  name: 'BaonBuddy',
  storeName: 'daily_snapshots',
});

export const LocalDB = {
  wallets: {
    async getAll(): Promise<Wallet[]> {
      const wallets: Wallet[] = [];
      await walletsStore.iterate((value: Wallet) => {
        wallets.push(value);
      });
      return wallets.sort((a, b) => b.id - a.id);
    },
    async get(id: number): Promise<Wallet | null> {
      return walletsStore.getItem(id.toString());
    },
    async set(wallet: Wallet): Promise<void> {
      await walletsStore.setItem(wallet.id.toString(), wallet);
    },
    async setAll(_wallets: Wallet[]): Promise<void> {
      throw new Error('setAll() is destructive and disabled. Restore this intentionally if needed.');
    },
    async remove(id: number): Promise<void> {
      await walletsStore.removeItem(id.toString());
    },
    async clear(): Promise<void> {
      await walletsStore.clear();
    },
  },

  transactions: {
    async getAll(): Promise<Transaction[]> {
      const transactions: Transaction[] = [];
      await transactionsStore.iterate((value: Transaction) => {
        transactions.push(value);
      });
      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    async getUnsynced(): Promise<Transaction[]> {
      const transactions: Transaction[] = [];
      await transactionsStore.iterate((value: Transaction) => {
        if (value.synced === false) {
          transactions.push(value);
        }
      });
      return transactions;
    },
    async get(id: number): Promise<Transaction | null> {
      return transactionsStore.getItem(id.toString());
    },
    async set(transaction: Transaction): Promise<void> {
      await transactionsStore.setItem(transaction.id.toString(), transaction);
    },
    async setAll(_transactions: Transaction[]): Promise<void> {
      throw new Error('setAll() is destructive and disabled. Restore this intentionally if needed.');
    },
    async remove(id: number): Promise<void> {
      await transactionsStore.removeItem(id.toString());
    },
    async clear(): Promise<void> {
      await transactionsStore.clear();
    },
    async markAsSynced(id: number): Promise<void> {
      const transaction = await transactionsStore.getItem<Transaction>(id.toString());
      if (transaction) {
        transaction.synced = true;
        await transactionsStore.setItem(id.toString(), transaction);
      }
    },
  },

  categories: {
    async getAll(): Promise<Category[]> {
      const categories: Category[] = [];
      await categoriesStore.iterate((value: Category) => {
        categories.push(value);
      });
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    },
    async get(id: number): Promise<Category | null> {
      return categoriesStore.getItem(id.toString());
    },
    async set(category: Category): Promise<void> {
      await categoriesStore.setItem(category.id.toString(), category);
    },
    async setAll(_categories: Category[]): Promise<void> {
      throw new Error('setAll() is destructive and disabled. Restore this intentionally if needed.');
    },
    async remove(id: number): Promise<void> {
      await categoriesStore.removeItem(id.toString());
    },
    async clear(): Promise<void> {
      await categoriesStore.clear();
    },
  },

  alerts: {
    async getAll(): Promise<Alert[]> {
      const alerts: Alert[] = [];
      await alertsStore.iterate((value: Alert) => {
        alerts.push(value);
      });
      return alerts.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
    },
    async getActive(): Promise<Alert[]> {
      const alerts: Alert[] = [];
      await alertsStore.iterate((value: Alert) => {
        if (!value.dismissed) {
          alerts.push(value);
        }
      });
      return alerts;
    },
    async get(id: number): Promise<Alert | null> {
      return alertsStore.getItem(id.toString());
    },
    async set(alert: Alert): Promise<void> {
      await alertsStore.setItem(alert.id.toString(), alert);
    },
    async setAll(_alerts: Alert[]): Promise<void> {
      throw new Error('setAll() is destructive and disabled. Restore this intentionally if needed.');
    },
    async remove(id: number): Promise<void> {
      await alertsStore.removeItem(id.toString());
    },
    async clear(): Promise<void> {
      await alertsStore.clear();
    },
  },

  // --- Authentication (MPIN + Recovery) ---
  auth: {
    async getMPINHash(): Promise<string | null> {
      return authStore.getItem('mpin_hash');
    },
    async setMPINHash(hash: string): Promise<void> {
      await authStore.setItem('mpin_hash', hash);
      await authStore.setItem('mpin_initialized', true);
    },
    async isMPINInitialized(): Promise<boolean> {
      const value = await authStore.getItem<boolean>('mpin_initialized');
      return value === true;
    },
    async getRecoveryCodeHash(): Promise<string | null> {
      return authStore.getItem('recovery_code_hash');
    },
    async setRecoveryCodeHash(hash: string): Promise<void> {
      await authStore.setItem('recovery_code_hash', hash);
      await authStore.setItem('recovery_code_initialized', true);
    },
    async isRecoveryCodeInitialized(): Promise<boolean> {
      const value = await authStore.getItem<boolean>('recovery_code_initialized');
      return value === true;
    },
    async getFailedAttempts(): Promise<number> {
      const value = await authStore.getItem<number>('failed_attempts');
      return value || 0;
    },
    async setFailedAttempts(count: number): Promise<void> {
      await authStore.setItem('failed_attempts', count);
    },
    async getLockUntil(): Promise<number | null> {
      return authStore.getItem('lock_until');
    },
    async setLockUntil(timestamp: number | null): Promise<void> {
      if (timestamp === null) {
        await authStore.removeItem('lock_until');
      } else {
        await authStore.setItem('lock_until', timestamp);
      }
    },
    async getRecoveryFailedAttempts(): Promise<number> {
      const value = await authStore.getItem<number>('recovery_failed_attempts');
      return value || 0;
    },
    async setRecoveryFailedAttempts(count: number): Promise<void> {
      await authStore.setItem('recovery_failed_attempts', count);
    },
    async getRecoveryLockUntil(): Promise<number | null> {
      return authStore.getItem('recovery_lock_until');
    },
    async setRecoveryLockUntil(timestamp: number | null): Promise<void> {
      if (timestamp === null) {
        await authStore.removeItem('recovery_lock_until');
      } else {
        await authStore.setItem('recovery_lock_until', timestamp);
      }
    },
    async getSecurityQuestion(): Promise<string | null> {
      return authStore.getItem('security_question');
    },
    async setSecurityQuestion(question: string): Promise<void> {
      await authStore.setItem('security_question', question);
    },
    async getSecurityAnswerHash(): Promise<string | null> {
      return authStore.getItem('security_answer_hash');
    },
    async setSecurityAnswerHash(hash: string): Promise<void> {
      await authStore.setItem('security_answer_hash', hash);
    },
    async hasSecurityQuestion(): Promise<boolean> {
      const q = await authStore.getItem<string>('security_question');
      return !!q;
    },
    async clearAuth(): Promise<void> {
      await authStore.clear();
    },
  },

  // --- Metadata ---
  meta: {
    async getLastSync(): Promise<string | null> {
      return metaStore.getItem('lastSync');
    },
    async setLastSync(timestamp: string): Promise<void> {
      await metaStore.setItem('lastSync', timestamp);
    },
    async getDeviceId(): Promise<string> {
      let deviceId = await metaStore.getItem<string>('deviceId');
      if (!deviceId) {
        deviceId = 'device_' + crypto.randomUUID().replace(/-/g, '');
        await metaStore.setItem('deviceId', deviceId);
      }
      return deviceId;
    },
    async getTheme(): Promise<'light' | 'dark'> {
      const theme = await metaStore.getItem<'light' | 'dark'>('theme');
      return theme || 'light';
    },
    async setTheme(theme: 'light' | 'dark'): Promise<void> {
      await metaStore.setItem('theme', theme);
    },
    async getAllowanceSettings(): Promise<AllowanceSettings | null> {
      return metaStore.getItem('allowanceSettings');
    },
    async setAllowanceSettings(settings: AllowanceSettings): Promise<void> {
      await metaStore.setItem('allowanceSettings', settings);
    },
    async getCategoriesSeeded(): Promise<boolean> {
      const value = await metaStore.getItem<boolean>('categoriesSeeded');
      return value === true;
    },
    async setCategoriesSeeded(value: boolean): Promise<void> {
      await metaStore.setItem('categoriesSeeded', value);
    },
    async getGeminiKey(): Promise<string | null> {
      return metaStore.getItem('geminiApiKey');
    },
    async setGeminiKey(key: string | null): Promise<void> {
      if (key === null) {
        await metaStore.removeItem('geminiApiKey');
      } else {
        await metaStore.setItem('geminiApiKey', key);
      }
    },
    async clearAll(): Promise<void> {
      await metaStore.clear();
      await walletsStore.clear();
      await transactionsStore.clear();
      await categoriesStore.clear();
      await alertsStore.clear();
      await authStore.clear();
      await dailySnapshotsStore.clear();
    },
  },

  // --- Daily Snapshots (for carry-over calculation) ---
  dailySnapshots: {
    async get(date: string): Promise<DailySnapshot | null> {
      return dailySnapshotsStore.getItem(date);
    },
    async set(snapshot: DailySnapshot): Promise<void> {
      await dailySnapshotsStore.setItem(snapshot.date, snapshot);
    },
    async getAll(): Promise<DailySnapshot[]> {
      const snapshots: DailySnapshot[] = [];
      await dailySnapshotsStore.iterate((value: DailySnapshot) => {
        snapshots.push(value);
      });
      return snapshots.sort((a, b) => b.date.localeCompare(a.date));
    },
    async clear(): Promise<void> {
      await dailySnapshotsStore.clear();
    },
  },
};

export default LocalDB;
