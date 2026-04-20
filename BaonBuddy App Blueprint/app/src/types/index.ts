export interface Wallet {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  type: 'cash' | 'digital';
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  user_id?: number;
  is_default: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  wallet_id: number;
  category_id?: number;
  amount: number;
  note?: string;
  date: string;
  created_at: string;
  updated_at?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  wallet_name?: string;
  wallet_type?: string;
  image_url?: string;
  synced?: boolean;
}

export interface Alert {
  id: number;
  user_id: number;
  wallet_id?: number;
  threshold: number;
  message: string;
  triggered_at: string;
  dismissed: boolean;
  dismissed_at?: string;
}

export interface DailySpending {
  date: string;
  total: number;
  count: number;
}

export interface WeeklySpending {
  week_start: string;
  week_end: string;
  total: number;
  count: number;
}

export interface CategorySpending {
  category_id: number;
  category_name: string;
  category_icon?: string;
  category_color?: string;
  total: number;
  percentage: number;
  count: number;
}

export interface AnalyticsSummary {
  total_spent: number;
  total_transactions: number;
  average_daily: number;
  top_category?: CategorySpending;
  period_start: string;
  period_end: string;
}

// MPIN Authentication
export interface MPINState {
  isUnlocked: boolean;
  hasMPIN: boolean;
  isLoading: boolean;
}

export interface AppState {
  wallets: Wallet[];
  transactions: Transaction[];
  categories: Category[];
  alerts: Alert[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
}

// API types (kept for optional sync)
export interface WalletCreate {
  name: string;
  type: 'cash' | 'digital';
  balance: number;
}

export interface WalletUpdate {
  name?: string;
  balance?: number;
}

export interface CategoryCreate {
  name: string;
  icon?: string;
  color?: string;
}

export interface TransactionCreate {
  wallet_id: number;
  category_id?: number;
  amount: number;
  note?: string;
  date: string;
  image_url?: string;
}

export interface TransactionUpdate {
  wallet_id?: number;
  category_id?: number;
  amount?: number;
  note?: string;
  date?: string;
  image_url?: string;
}

export interface AlertCreate {
  threshold: number;
  message: string;
  wallet_id?: number;
}

export interface AllowanceSettings {
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface DailySnapshot {
  date: string;   // 'yyyy-MM-dd'
  spent: number;  // total amount spent that day
}
