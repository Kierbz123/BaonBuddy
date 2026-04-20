import { useState, useEffect, useCallback } from 'react';
import LocalDB from '@/services/localDB';
import type { Wallet, Transaction, Category, Alert } from '@/types';
import { logError } from '@/utils/errorLog';

export function useLocalData() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [walletsData, transactionsData, categoriesData, alertsData] = await Promise.all([
        LocalDB.wallets.getAll(),
        LocalDB.transactions.getAll(),
        LocalDB.categories.getAll(),
        LocalDB.alerts.getAll(),
      ]);
      setWallets(walletsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
      setAlerts(alertsData);
    } catch (error: any) {
      logError('Failed to load local data', error?.toString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addWallet = useCallback(async (wallet: Wallet) => {
    await LocalDB.wallets.set(wallet);
    setWallets(prev => [wallet, ...prev]);
  }, []);

  const updateWallet = useCallback(async (wallet: Wallet) => {
    await LocalDB.wallets.set(wallet);
    setWallets(prev => prev.map(w => w.id === wallet.id ? wallet : w));
  }, []);

  const deleteWallet = useCallback(async (id: number) => {
    await LocalDB.wallets.remove(id);
    setWallets(prev => prev.filter(w => w.id !== id));
  }, []);

  const addTransaction = useCallback(async (transaction: Transaction) => {
    await LocalDB.transactions.set(transaction);
    setTransactions(prev => [transaction, ...prev].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ));
  }, []);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    await LocalDB.transactions.set(transaction);
    setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
  }, []);

  const deleteTransaction = useCallback(async (id: number) => {
    await LocalDB.transactions.remove(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCategory = useCallback(async (category: Category) => {
    await LocalDB.categories.set(category);
    setCategories(prev => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const addAlert = useCallback(async (alert: Alert) => {
    await LocalDB.alerts.set(alert);
    setAlerts(prev => [alert, ...prev]);
  }, []);

  const dismissAlert = useCallback(async (id: number) => {
    const alert = await LocalDB.alerts.get(id);
    if (alert) {
      alert.dismissed = true;
      alert.dismissed_at = new Date().toISOString();
      await LocalDB.alerts.set(alert);
      setAlerts(prev => prev.map(a => a.id === id ? alert : a));
    }
  }, []);

  const refreshData = loadData;

  return {
    wallets,
    transactions,
    categories,
    alerts,
    isLoading,
    addWallet,
    updateWallet,
    deleteWallet,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    addAlert,
    dismissAlert,
    refreshData,
  };
}

export default useLocalData;
