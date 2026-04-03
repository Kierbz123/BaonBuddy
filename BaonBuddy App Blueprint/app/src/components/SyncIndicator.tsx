import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, WifiOff } from 'lucide-react';

interface SyncIndicatorProps {
  isSyncing: boolean;
  isOnline: boolean;
}

export function SyncIndicator({ isSyncing, isOnline }: SyncIndicatorProps) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-1 text-xs z-50 flex items-center justify-center gap-2"
        >
          <WifiOff className="w-3 h-3" />
          Offline mode - Changes will sync when you reconnect
        </motion.div>
      )}
      
      {isSyncing && isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-1 text-xs z-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing...
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SyncIndicator;
