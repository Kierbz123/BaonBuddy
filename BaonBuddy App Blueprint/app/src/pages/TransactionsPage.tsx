import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { Transaction } from '@/types';

interface TransactionsPageProps {
  onNavigate: (page: string) => void;
}

export function TransactionsPage({ onNavigate }: TransactionsPageProps) {
  const { transactions, wallets, categories, deleteTransaction } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWallet, setFilterWallet] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<number | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !searchQuery || 
        t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWallet = filterWallet === 'all' || t.wallet_id?.toString() === filterWallet;
      const matchesCategory = filterCategory === 'all' || t.category_id?.toString() === filterCategory;
      return matchesSearch && matchesWallet && matchesCategory;
    });
  }, [transactions, searchQuery, filterWallet, filterCategory]);

  const handleDelete = async (id: number) => {
    setDeletingTransactionId(id);
  };

  const confirmDelete = async () => {
    if (deletingTransactionId) {
      await deleteTransaction(deletingTransactionId);
      toast.success('Transaction deleted');
      setDeletingTransactionId(null);
    }
  };

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      const date = t.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterWallet} onValueChange={setFilterWallet}>
            <SelectTrigger className="flex-1 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Wallet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wallets</SelectItem>
              {wallets.map(w => (
                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="flex-1 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Transactions List */}
      <div className="space-y-4">
        <AnimatePresence>
          {groupedTransactions.map(([date, txs], groupIndex) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <span className="text-sm text-gray-400">
                  ({txs.length} transaction{txs.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="space-y-2">
                {txs.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="group border-0 shadow-sm bg-white/80 dark:bg-[#2D2D44]/80 backdrop-blur-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardContent className="p-4">
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
                                <CategoryIcon icon={transaction.category_icon} className="w-6 h-6 drop-shadow-sm" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">
                                {transaction.category_name || 'Uncategorized'}
                              </p>
                              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
                                  {transaction.note || 'No description'}
                                </p>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold shrink-0">
                                  {transaction.wallet_name}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-extrabold text-red-500 dark:text-red-400 text-lg tracking-tight">
                              -{formatCurrency(transaction.amount)}
                            </p>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600"
                                onClick={() => setEditingTransaction(transaction)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500"
                                onClick={() => handleDelete(transaction.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredTransactions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
          </motion.div>
        )}
      </div>
      {/* Edit Modal */}
      <AnimatePresence>
        {editingTransaction && (
          <TransactionEditModal 
            transaction={editingTransaction} 
            onClose={() => setEditingTransaction(null)} 
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTransactionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm"
            >
              <Card className="border-0 shadow-2xl bg-white dark:bg-[#2D2D44] p-6 text-center">
                <Trash2 className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Delete Transaction?</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl"
                    onClick={() => setDeletingTransactionId(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600"
                    onClick={confirmDelete}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TransactionEditModal({ 
  transaction, 
  onClose 
}: { 
  transaction: Transaction; 
  onClose: () => void;
}) {
  const { wallets, categories, updateTransaction } = useApp();
  const [amount, setAmount] = useState(transaction.amount?.toString() || '0');
  const [walletId, setWalletId] = useState(transaction.wallet_id?.toString() || '');
  const [categoryId, setCategoryId] = useState(transaction.category_id?.toString() || '');
  const [note, setNote] = useState(transaction.note || '');
  const [date, setDate] = useState(transaction.date || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    await updateTransaction(transaction.id, {
      amount: parsedAmount,
      wallet_id: parseInt(walletId),
      category_id: categoryId ? parseInt(categoryId) : undefined,
      note: note || undefined,
      date,
    });
    setIsSubmitting(false);
    toast.success('Transaction updated');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-lg"
      >
        <Card className="border-0 shadow-2xl bg-white dark:bg-[#2D2D44] overflow-hidden">
          <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] text-white">
            <h2 className="text-xl font-bold">Edit Transaction</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold h-14 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wallet</Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{c.icon}</span>
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-xl h-12"
                placeholder="Transaction note"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default TransactionsPage;
