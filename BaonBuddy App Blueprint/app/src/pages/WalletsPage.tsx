import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Wallet, 
  Plus, 
  ArrowLeft, 
  Trash2, 
  Edit2,
  Banknote,
  CreditCard,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import type { Wallet as WalletType } from '@/types';

interface WalletsPageProps {
  onNavigate: (page: string) => void;
}

export function WalletsPage({ onNavigate }: WalletsPageProps) {
  const { wallets, addWallet, updateWallet, deleteWallet } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [newWallet, setNewWallet] = useState({ name: '', type: 'cash' as 'cash' | 'digital', balance: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddWallet = async () => {
    if (!newWallet.name || !newWallet.balance) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    await addWallet({
      user_id: 0,
      name: newWallet.name,
      type: newWallet.type,
      balance: parseFloat(newWallet.balance),
    });
    setIsSubmitting(false);
    setIsAdding(false);
    setNewWallet({ name: '', type: 'cash', balance: '' });
    toast.success('Wallet created successfully');
  };

  const handleUpdateWallet = async () => {
    if (!editingWallet) return;
    
    await updateWallet(editingWallet.id, {
      name: editingWallet.name,
      balance: editingWallet.balance,
    });
    setEditingWallet(null);
    toast.success('Wallet updated successfully');
  };

  const handleDeleteWallet = async (id: number) => {
    if (confirm('Are you sure you want to delete this wallet?')) {
      await deleteWallet(id);
      toast.success('Wallet deleted successfully');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Wallets</h1>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full bg-[#6C5CE7]">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Wallet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Wallet Name</Label>
                <Input
                  placeholder="e.g., Cash, GCash, Bank"
                  value={newWallet.name}
                  onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Wallet Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={newWallet.type === 'cash' ? 'default' : 'outline'}
                    className={newWallet.type === 'cash' ? 'bg-emerald-500' : ''}
                    onClick={() => setNewWallet({ ...newWallet, type: 'cash' })}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={newWallet.type === 'digital' ? 'default' : 'outline'}
                    className={newWallet.type === 'digital' ? 'bg-blue-500' : ''}
                    onClick={() => setNewWallet({ ...newWallet, type: 'digital' })}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Digital
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Initial Balance</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newWallet.balance}
                  onChange={(e) => setNewWallet({ ...newWallet, balance: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleAddWallet} 
                className="w-full bg-[#6C5CE7]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Wallet'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Wallets List */}
      <div className="space-y-3">
        <AnimatePresence>
          {wallets.map((wallet, index) => (
            <motion.div
              key={wallet.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        wallet.type === 'cash' 
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                      }`}>
                        {wallet.type === 'cash' ? <Banknote className="w-7 h-7" /> : <CreditCard className="w-7 h-7" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-lg">{wallet.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{wallet.type} Wallet</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(wallet.balance)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingWallet(wallet)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => handleDeleteWallet(wallet.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {wallets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Wallet className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No wallets yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Create your first wallet to get started</p>
          </motion.div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingWallet} onOpenChange={() => setEditingWallet(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Wallet</DialogTitle>
          </DialogHeader>
          {editingWallet && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Wallet Name</Label>
                <Input
                  value={editingWallet.name}
                  onChange={(e) => setEditingWallet({ ...editingWallet, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Balance</Label>
                <Input
                  type="number"
                  value={editingWallet.balance}
                  onChange={(e) => setEditingWallet({ ...editingWallet, balance: parseFloat(e.target.value) })}
                />
              </div>
              <Button onClick={handleUpdateWallet} className="w-full bg-[#6C5CE7]">
                Update Wallet
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WalletsPage;
