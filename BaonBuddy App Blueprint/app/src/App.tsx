import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AppProvider, useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { MPINPage } from '@/pages/MPINPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WalletsPage } from '@/pages/WalletsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AddExpensePage } from '@/pages/AddExpensePage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { BottomNav } from '@/components/BottomNav';
import { SyncIndicator } from '@/components/SyncIndicator';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'framer-motion';

type Page = 'dashboard' | 'wallets' | 'transactions' | 'add' | 'analytics' | 'alerts' | 'settings';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { isUnlocked, isLoading } = useAuth();
  const { isSyncing } = useApp();
  const { theme } = useTheme();

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'wallets':
        return <WalletsPage onNavigate={handleNavigate} />;
      case 'transactions':
        return <TransactionsPage onNavigate={handleNavigate} />;
      case 'add':
        return <AddExpensePage onNavigate={handleNavigate} />;
      case 'analytics':
        return <AnalyticsPage onNavigate={handleNavigate} />;
      case 'alerts':
        return <AlertsPage onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#1E1E2F]' : 'bg-[#F9F9F9]'}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Show MPIN page if not unlocked (setup or unlock mode)
  if (!isUnlocked) {
    return (
      <>
        <MPINPage />
        <Toaster position="top-center" />
      </>
    );
  }

  // Main app — user is authenticated
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1E1E2F]' : 'bg-[#F9F9F9]'} transition-colors duration-300`}>
      <SyncIndicator isSyncing={isSyncing} isOnline={navigator.onLine} />
      
      <main className="pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      <Toaster position="top-center" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
