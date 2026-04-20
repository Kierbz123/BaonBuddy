import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Bell,
  ArrowRight,
  PiggyBank,
  Cpu,
  CalendarClock,
  AlertCircle
} from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { toast } from 'sonner';
import OfflineAIService from '@/services/aiSkills';
// Offline AI Service for burn rate prediction
interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { 
    wallets, 
    transactions, 
    alerts, 
    totalBalance, 
    totalSpentToday, 
    totalSpentThisWeek,
    allowance,
    currentAllowanceSpent,
    isLoading,
    dailyLimit,
    carryOver,
    todayBudgetLimit,
    todayBudgetRemaining,
    isAIDrivenBudget,
    aiDailyBudget,
    aiTodayDayName,
  } = useApp();

  const totalSaved = Math.max(0, allowance.amount - currentAllowanceSpent);

  const [burnPrediction, setBurnPrediction] = useState<string | null>(null);

  // Burn-rate prediction — fully local, no API key
  useEffect(() => {
    if (transactions.length > 2) {
      const prediction = OfflineAIService.predictBurnRate(transactions, allowance.amount);
      setBurnPrediction(prediction);
    }
  }, [transactions, allowance]);

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const recentTransactions = transactions.slice(0, 5);

  useEffect(() => {
    const checkAlerts = async () => {
      for (const wallet of wallets) {
        if (wallet.balance <= 50) {
          toast.warning(`Low balance in ${wallet.name}: ${formatCurrency(wallet.balance)}`, {
            duration: 5000,
          });
        }
      }
    };
    
    if (wallets.length > 0) {
      checkAlerts();
    }
  }, [wallets]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Good Day!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(new Date())}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => onNavigate('alerts')}
          >
            <Bell className="w-5 h-5" />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeAlerts.length}
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 bg-gradient-to-br from-[#6C5CE7] to-[#A463F5] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-white/80" />
              <span className="text-white/80 text-sm">Total Balance</span>
            </div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold"
            >
              {formatCurrency(totalBalance)}
            </motion.h2>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>Today: {formatCurrency(totalSpentToday)}</span>
              </div>
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>This Week: {formatCurrency(totalSpentThisWeek)}</span>
              </div>
            </div>

            {burnPrediction && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="mt-4 pt-3 border-t border-white/20 flex gap-2 items-center"
              >
                <Cpu className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="text-xs text-white/90 font-medium">
                  {burnPrediction}
                </span>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Budget + Carry-Over Widget */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44] overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-[#6C5CE7]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">Today's Budget</p>
                  {isAIDrivenBudget && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[9px] font-bold uppercase tracking-wide">
                      <Cpu className="w-2.5 h-2.5" /> AI Adjusted
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {isAIDrivenBudget && aiDailyBudget !== null
                    ? `AI learned you spend more on ${aiTodayDayName}s · Base: ${formatCurrency(dailyLimit)}`
                    : `Base: ${formatCurrency(dailyLimit)}${carryOver > 0 ? ` · Carry-over: -${formatCurrency(carryOver)}` : ''}`
                  }
                </p>
              </div>
              {totalSpentToday > todayBudgetLimit && (
                <div className="ml-auto">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>

            {/* Carry-over badge */}
            {carryOver > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 px-3 py-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-2"
              >
                <TrendingDown className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                  Yesterday's excess of {formatCurrency(carryOver)} has been deducted from today.
                </p>
              </motion.div>
            )}

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {formatCurrency(todayBudgetRemaining)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  of {formatCurrency(todayBudgetLimit)} remaining
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                {(() => {
                  const pct = todayBudgetLimit > 0
                    ? Math.min(100, (totalSpentToday / todayBudgetLimit) * 100)
                    : 0;
                  const barColor = pct >= 100 ? '#ef4444' : pct >= 75 ? '#f97316' : '#6C5CE7';
                  return (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                <span>Spent: {formatCurrency(totalSpentToday)}</span>
                <span>
                  {todayBudgetLimit > 0
                    ? `${Math.min(100, Math.round((totalSpentToday / todayBudgetLimit) * 100))}% used`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Over-budget warning */}
            {totalSpentToday > todayBudgetLimit && todayBudgetLimit > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  ⚠️ Over budget by {formatCurrency(totalSpentToday - todayBudgetLimit)}. This excess will carry over tomorrow.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        <div className="bg-white dark:bg-[#2D2D44] rounded-2xl p-4 shadow-sm text-center border border-gray-100 dark:border-gray-700">
          <p className="text-2xl font-extrabold text-[#6C5CE7]">₱{currentAllowanceSpent.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">Total Spent</p>
        </div>
        <div className="bg-white dark:bg-[#2D2D44] rounded-2xl p-4 shadow-sm text-center border border-gray-100 dark:border-gray-700">
          <p className="text-2xl font-extrabold text-emerald-500">₱{totalSaved.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">Total Saved</p>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Wallets</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('wallets')}>
            See All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {wallets.slice(0, 2).map((wallet, index) => (
            <motion.div
              key={wallet.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      wallet.type === 'cash' 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                    }`}>
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{wallet.type}</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{wallet.name}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(wallet.balance)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {wallets.length === 0 && (
            <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44] col-span-2">
              <CardContent className="p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400">No wallets yet</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate('wallets')}
                  className="mt-2"
                >
                  Create your first wallet
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('transactions')}>
            See All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-2">
          {recentTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              whileHover={{ x: 4 }}
            >
                    <Card className="group border-0 shadow-sm bg-white/80 dark:bg-[#2D2D44]/80 backdrop-blur-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner group-hover:scale-105 transition-transform duration-300"
                              style={{ 
                                backgroundColor: transaction.image_url ? 'transparent' : `${transaction.category_color}15`, 
                                color: transaction.category_color 
                              }}
                            >
                              {transaction.image_url ? (
                                <>
                                  <img 
                                    src={transaction.image_url} 
                                    alt="Receipt" 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/5" />
                                </>
                              ) : (
                                <CategoryIcon icon={transaction.category_icon} className="w-6 h-6 relative z-10" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
                                {transaction.category_name || 'Uncategorized'}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-medium">
                                {transaction.note || 'No description'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <p className="font-extrabold text-red-500 dark:text-red-400 text-sm tracking-tight text-right">
                              -{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-[9px] uppercase tracking-tighter text-gray-400 dark:text-gray-500 font-bold text-right">
                              {transaction.date}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
            </motion.div>
          ))}
          {recentTransactions.length === 0 && (
            <Card className="border-0 shadow-sm bg-white dark:bg-[#2D2D44]">
              <CardContent className="p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* FABs */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        className="fixed bottom-24 right-4 flex flex-col gap-3 items-center"
      >
        <Button
          size="lg"
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/50"
          onClick={() => onNavigate('add')}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>
    </div>
  );
}

export default DashboardPage;
