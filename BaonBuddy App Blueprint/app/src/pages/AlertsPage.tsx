import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Bell, 
  Check,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/utils/formatters';
import { toast } from 'sonner';

interface AlertsPageProps {
  onNavigate: (page: string) => void;
}

export function AlertsPage({ onNavigate }: AlertsPageProps) {
  const { alerts, wallets, dismissAlert } = useApp();

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dismissedAlerts = alerts.filter(a => a.dismissed);

  const getAlertIcon = (threshold: number) => {
    if (threshold <= 10) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (threshold <= 25) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    return <Bell className="w-5 h-5 text-yellow-500" />;
  };

  const getAlertColor = (threshold: number) => {
    if (threshold <= 10) return 'border-l-red-500';
    if (threshold <= 25) return 'border-l-orange-500';
    return 'border-l-yellow-500';
  };

  const handleDismiss = async (id: number) => {
    await dismissAlert(id);
    toast.success('Alert dismissed');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts</h1>
        {activeAlerts.length > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {activeAlerts.length}
          </span>
        )}
      </motion.div>

      {/* Active Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Active Alerts</h2>
        <div className="space-y-2">
          <AnimatePresence>
            {activeAlerts.map((alert, index) => {
              const wallet = wallets.find(w => w.id === alert.wallet_id);
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`border-0 shadow-lg bg-white dark:bg-[#2D2D44] border-l-4 ${getAlertColor(alert.threshold)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            {getAlertIcon(alert.threshold)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              Low Balance Alert
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {alert.message}
                            </p>
                            {wallet && (
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                                Current balance: {formatCurrency(wallet.balance)}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelativeTime(alert.triggered_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-500"
                          onClick={() => handleDismiss(alert.id)}
                        >
                          <Check className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {activeAlerts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Bell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No active alerts</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">You&apos;re all caught up!</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Dismissed Alerts */}
      {dismissedAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Dismissed</h2>
          <div className="space-y-2 opacity-60">
            {dismissedAlerts.slice(0, 5).map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm bg-gray-50 dark:bg-gray-800/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {alert.message}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(alert.dismissed_at || alert.triggered_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default AlertsPage;
