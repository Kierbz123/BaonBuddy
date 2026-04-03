import { motion } from 'framer-motion';
import { 
  Home, 
  BarChart2, 
  Plus, 
  Target, 
  User 
} from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const items = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'analytics', icon: BarChart2, label: 'Insights' },
    { id: 'add', icon: Plus, label: 'Add', isFab: true },
    { id: 'wallets', icon: Target, label: 'Goals' },
    { id: 'settings', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-md mx-auto h-16 relative">
        {items.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <div key={item.id} className="relative -mt-8">
                <button
                  onClick={() => onNavigate(item.id)}
                  className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform"
                >
                  <Icon className="w-8 h-8" strokeWidth={2.5} />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
              }`}
            >
              <Icon className="w-5.5 h-5.5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabDot"
                  className="w-1 h-1 rounded-full bg-primary mt-0.5"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
