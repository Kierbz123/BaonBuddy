import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import LocalDB from '@/services/localDB';
import { SyncService } from '@/services/sync';
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import type { Wallet, Transaction, Category, Alert, AllowanceSettings } from '@/types';

// Default categories seeded on first launch (no backend required)
const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'created_at'>[] = [
  { name: 'Food & Drinks', icon: '🍔', color: '#FF6B6B', user_id: 0, is_default: 1 },
  { name: 'Transportation', icon: '🚌', color: '#4ECDC4', user_id: 0, is_default: 1 },
  { name: 'School Supplies', icon: '📚', color: '#45B7D1', user_id: 0, is_default: 1 },
  { name: 'Entertainment', icon: '🎮', color: '#96CEB4', user_id: 0, is_default: 1 },
  { name: 'Clothing', icon: '👕', color: '#FFEAA7', user_id: 0, is_default: 1 },
  { name: 'Health', icon: '💊', color: '#DDA0DD', user_id: 0, is_default: 1 },
  { name: 'Load/Data', icon: '📱', color: '#74B9FF', user_id: 0, is_default: 1 },
  { name: 'Others', icon: '🎁', color: '#636E72', user_id: 0, is_default: 1 },
];

interface AppContextType {
  wallets: Wallet[];
  transactions: Transaction[];
  categories: Category[];
  alerts: Alert[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  addWallet: (wallet: Omit<Wallet, 'id' | 'created_at'>) => Promise<void>;
  updateWallet: (id: number, updates: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: number) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'synced'>) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<void>;
  dismissAlert: (id: number) => Promise<void>;
  sync: () => Promise<void>;
  checkLowBalance: (walletId: number) => Promise<void>;
  allowance: AllowanceSettings;
  updateAllowance: (settings: AllowanceSettings) => Promise<void>;
  totalBalance: number;
  totalSpentToday: number;
  totalSpentThisWeek: number;
  totalSpentThisMonth: number;
  currentAllowanceSpent: number;
  // Daily budget + carry-over
  dailyLimit: number;
  carryOver: number;
  todayBudgetLimit: number;
  todayBudgetRemaining: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<AllowanceSettings>({ amount: 1000, period: 'monthly' });
  const [carryOver, setCarryOver] = useState<number>(0);
  const lastSnapshotDateRef = useRef<string>('');
  
  const { isOnline } = useNetwork();
  const { isUnlocked } = useAuth();
  const syncServiceRef = useRef<SyncService | null>(null);

  // Initialize sync service with deviceId (no token required)
  useEffect(() => {
    const initSync = async () => {
      const deviceId = await LocalDB.meta.getDeviceId();
      syncServiceRef.current = new SyncService(deviceId, {
        onSyncStart: () => setIsSyncing(true),
        onSyncComplete: () => setIsSyncing(false),
        onSyncError: (error) => {
          console.warn('Background sync skipped (offline or server unavailable):', error.message);
          setIsSyncing(false);
        },
      });
    };
    initSync();
  }, []);

  /**
   * Seed default categories on first launch
   */
  const seedDefaultCategories = useCallback(async () => {
    try {
      const alreadySeeded = await LocalDB.meta.getCategoriesSeeded();
      if (alreadySeeded) return;

      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const cat = DEFAULT_CATEGORIES[i];
        const newCategory: Category = {
          ...cat,
          id: Date.now() + i,
          created_at: new Date().toISOString(),
        };
        await LocalDB.categories.set(newCategory);
      }
      await LocalDB.meta.setCategoriesSeeded(true);
    } catch (error) {
      console.error('Failed to seed categories:', error);
    }
  }, []);

  const loadLocalData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Seed categories first if needed
      await seedDefaultCategories();

      const [walletsData, transactionsData, categoriesData, alertsData, lastSyncData, allowanceData] = await Promise.all([
        LocalDB.wallets.getAll(),
        LocalDB.transactions.getAll(),
        LocalDB.categories.getAll(),
        LocalDB.alerts.getAll(),
        LocalDB.meta.getLastSync(),
        LocalDB.meta.getAllowanceSettings(),
      ]);
      setWallets(walletsData);
      // Retroactively enrich transactions that are missing category/wallet display fields
      const enrichedTransactions = transactionsData.map(t => {
        let enriched = { ...t };
        if (t.category_id && !t.category_name) {
          const cat = categoriesData.find(c => c.id === t.category_id);
          if (cat) {
            enriched = { ...enriched, category_name: cat.name, category_icon: cat.icon, category_color: cat.color };
          }
        }
        if (t.wallet_id && !t.wallet_name) {
          const wal = walletsData.find(w => w.id === t.wallet_id);
          if (wal) {
            enriched = { ...enriched, wallet_name: wal.name, wallet_type: wal.type };
          }
        }
        return enriched;
      });
      setTransactions(enrichedTransactions);
      setCategories(categoriesData);
      setAlerts(alertsData);
      setLastSync(lastSyncData);
      if (allowanceData) setAllowance(allowanceData);
    } catch (error) {
      console.error('Failed to load local data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [seedDefaultCategories]);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  // ===================== DAILY SNAPSHOT + CARRY-OVER =====================

  /**
   * Saves today's snapshot and computes carry-over from yesterday.
   * Called after data is loaded and whenever the clock crosses midnight.
   */
  const processDailySnapshotAndCarryOver = useCallback(async (
    txns: Transaction[],
    currentAllowance: AllowanceSettings
  ) => {
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Compute daily limit
    const periodDivisor =
      currentAllowance.period === 'daily' ? 1
      : currentAllowance.period === 'weekly' ? 7
      : 30;
    const limit = currentAllowance.amount / periodDivisor;

    // Save yesterday's snapshot if not already saved
    if (lastSnapshotDateRef.current !== yesterdayStr) {
      const yesterdaySpent = txns
        .filter(t => t.date === yesterdayStr)
        .reduce((s, t) => s + Number(t.amount), 0);
      const existingSnap = await LocalDB.dailySnapshots.get(yesterdayStr);
      if (!existingSnap && yesterdaySpent > 0) {
        await LocalDB.dailySnapshots.set({ date: yesterdayStr, spent: yesterdaySpent });
      }
      lastSnapshotDateRef.current = yesterdayStr;
    }

    // Compute carry-over: excess spending from yesterday
    const yesterdaySnapshot = await LocalDB.dailySnapshots.get(yesterdayStr);
    if (yesterdaySnapshot) {
      const excess = yesterdaySnapshot.spent - limit;
      setCarryOver(Math.max(0, excess));
    } else {
      setCarryOver(0);
    }
  }, []);

  // Process carry-over when data loads
  useEffect(() => {
    if (!isLoading && transactions.length >= 0) {
      processDailySnapshotAndCarryOver(transactions, allowance);
    }
  }, [isLoading, transactions, allowance, processDailySnapshotAndCarryOver]);

  // Check for midnight day change every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSnapshotDateRef.current && lastSnapshotDateRef.current !== format(subDays(new Date(), 1), 'yyyy-MM-dd')) {
        processDailySnapshotAndCarryOver(transactions, allowance);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [transactions, allowance, processDailySnapshotAndCarryOver]);

  useEffect(() => {
    if (isOnline && isUnlocked && syncServiceRef.current) {
      syncServiceRef.current.sync().catch(() => {
        // Silently ignore — server may not be available
      });
    }
  }, [isOnline, isUnlocked]);

  // ===================== WALLET CRUD (Fully Offline) =====================

  const addWallet = useCallback(async (walletData: Omit<Wallet, 'id' | 'created_at'>) => {
    const newWallet: Wallet = {
      ...walletData,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    await LocalDB.wallets.set(newWallet);
    setWallets(prev => [...prev, newWallet]);
  }, []);

  const updateWallet = useCallback(async (id: number, updates: Partial<Wallet>) => {
    const wallet = await LocalDB.wallets.get(id);
    if (!wallet) return;
    const updated = { ...wallet, ...updates };
    await LocalDB.wallets.set(updated);
    setWallets(prev => prev.map(w => w.id === id ? updated : w));
  }, []);

  const deleteWallet = useCallback(async (id: number) => {
    await LocalDB.wallets.remove(id);
    setWallets(prev => prev.filter(w => w.id !== id));
  }, []);

  // ===================== TRANSACTION CRUD (Fully Offline) =====================

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'created_at' | 'synced'>) => {
    // Enrich with category display fields so they render correctly offline
    let category_name: string | undefined;
    let category_icon: string | undefined;
    let category_color: string | undefined;

    if (transactionData.category_id) {
      const cat = await LocalDB.categories.get(transactionData.category_id);
      if (cat) {
        category_name = cat.name;
        category_icon = cat.icon;
        category_color = cat.color;
      }
    }

    // Enrich with wallet display fields
    let wallet_name: string | undefined;
    let wallet_type: string | undefined;
    const walletForEnrich = await LocalDB.wallets.get(transactionData.wallet_id);
    if (walletForEnrich) {
      wallet_name = walletForEnrich.name;
      wallet_type = walletForEnrich.type;
    }

    const newTransaction: Transaction = {
      ...transactionData,
      category_name,
      category_icon,
      category_color,
      wallet_name,
      wallet_type,
      id: Date.now(),
      created_at: new Date().toISOString(),
      synced: false,
    };
    await LocalDB.transactions.set(newTransaction);
    setTransactions(prev => [newTransaction, ...prev]);

    // Update wallet balance immediately
    if (walletForEnrich) {
      const updatedWallet = { ...walletForEnrich, balance: walletForEnrich.balance - transactionData.amount };
      await LocalDB.wallets.set(updatedWallet);
      setWallets(prev => prev.map(w => w.id === updatedWallet.id ? updatedWallet : w));
    }
  }, []);

  const updateTransaction = useCallback(async (id: number, updates: Partial<Transaction>) => {
    const transaction = await LocalDB.transactions.get(id);
    if (!transaction) return;

    // Re-enrich category display fields if category changed
    let categoryEnrichment: Partial<Transaction> = {};
    const newCategoryId = updates.category_id ?? transaction.category_id;
    if (newCategoryId) {
      const cat = await LocalDB.categories.get(newCategoryId);
      if (cat) {
        categoryEnrichment = {
          category_name: cat.name,
          category_icon: cat.icon,
          category_color: cat.color,
        };
      }
    }

    const updated = { ...transaction, ...updates, ...categoryEnrichment, synced: false };
    await LocalDB.transactions.set(updated);
    setTransactions(prev => prev.map(t => t.id === id ? updated : t));
  }, []);

  const deleteTransaction = useCallback(async (id: number) => {
    const transaction = await LocalDB.transactions.get(id);
    if (!transaction) return;

    // Refund wallet balance
    if (transaction.wallet_id) {
      const wallet = await LocalDB.wallets.get(transaction.wallet_id);
      if (wallet) {
        const updated = { ...wallet, balance: wallet.balance + transaction.amount };
        await LocalDB.wallets.set(updated);
        setWallets(prev => prev.map(w => w.id === updated.id ? updated : w));
      }
    }

    await LocalDB.transactions.remove(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // ===================== CATEGORY CRUD (Fully Offline) =====================

  const addCategory = useCallback(async (categoryData: Omit<Category, 'id' | 'created_at'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    await LocalDB.categories.set(newCategory);
    setCategories(prev => [...prev, newCategory]);
  }, []);

  // ===================== ALERTS =====================

  const dismissAlert = useCallback(async (id: number) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const updated = { ...alert, dismissed: true, dismissed_at: new Date().toISOString() };
    await LocalDB.alerts.set(updated);
    setAlerts(prev => prev.map(a => a.id === id ? updated : a));
  }, [alerts]);

  const checkLowBalance = useCallback(async (walletId: number) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;
    const thresholds = [50, 25, 10];
    for (const threshold of thresholds) {
      if (wallet.balance <= threshold) {
        const existingAlert = alerts.find(a =>
          a.wallet_id === walletId &&
          a.threshold === threshold &&
          !a.dismissed
        );
        if (!existingAlert) {
          const newAlert: Alert = {
            id: Date.now(),
            user_id: 0,
            wallet_id: walletId,
            threshold,
            message: `Your ${wallet.name} wallet balance is below ₱${threshold}!`,
            triggered_at: new Date().toISOString(),
            dismissed: false,
          };
          await LocalDB.alerts.set(newAlert);
          setAlerts(prev => [newAlert, ...prev]);
        }
      }
    }
  }, [wallets, alerts]);

  // ===================== ALLOWANCE =====================

  const updateAllowance = useCallback(async (settings: AllowanceSettings) => {
    await LocalDB.meta.setAllowanceSettings(settings);
    setAllowance(settings);
  }, []);

  // ===================== SYNC =====================

  const sync = useCallback(async () => {
    if (syncServiceRef.current) {
      await syncServiceRef.current.sync().catch(() => {});
      await loadLocalData();
    }
  }, [loadLocalData]);

  // ===================== COMPUTED VALUES =====================

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const today = new Date().toISOString().split('T')[0];
  const totalSpentToday = transactions
    .filter(t => t.date === today)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const totalSpentThisWeek = transactions
    .filter(t => new Date(t.date) >= weekAgo)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthAgo = new Date();
  monthAgo.setDate(1);
  const totalSpentThisMonth = transactions
    .filter(t => new Date(t.date) >= monthAgo)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const currentAllowanceSpent = allowance.period === 'daily'
    ? totalSpentToday
    : allowance.period === 'weekly'
      ? totalSpentThisWeek
      : totalSpentThisMonth;

  // Daily budget limit and carry-over adjusted remaining
  const dailyLimit = allowance.amount / (
    allowance.period === 'daily' ? 1
    : allowance.period === 'weekly' ? 7
    : 30
  );
  const todayBudgetLimit = Math.max(0, dailyLimit - carryOver);
  const todayBudgetRemaining = Math.max(0, todayBudgetLimit - totalSpentToday);


  return (
    <AppContext.Provider value={{
      wallets,
      transactions,
      categories,
      alerts,
      isLoading,
      isSyncing,
      lastSync,
      addWallet,
      updateWallet,
      deleteWallet,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      dismissAlert,
      sync,
      checkLowBalance,
      allowance,
      updateAllowance,
      totalBalance,
      totalSpentToday,
      totalSpentThisWeek,
      totalSpentThisMonth,
      currentAllowanceSpent,
      dailyLimit,
      carryOver,
      todayBudgetLimit,
      todayBudgetRemaining,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
