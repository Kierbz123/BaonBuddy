import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Calculator,
  Wallet,
  Tag,
  FileText,
  Calendar,
  Loader2,
  Camera,
  Upload,
  X,
  ScanLine
} from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { format } from 'date-fns';
import OfflineAIService from '@/services/aiSkills';
import { AIErrorBoundary } from '@/components/AIErrorBoundary';
import LocalDB from '@/services/localDB';
import { logError } from '@/utils/errorLog';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { ReceiptData } from '@/services/aiSkills';

/** Convert a blob/file URL to a Base64 data URI for offline storage */
async function toBase64DataUri(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface AddExpensePageProps {
  onNavigate: (page: string) => void;
}

export function AddExpensePage({ onNavigate }: AddExpensePageProps) {
  const { wallets, categories, transactions, allowance, addTransaction, checkLowBalance, todayBudgetLimit, todayBudgetRemaining } = useApp();
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');



  // Auto-Categorization triggered by typing a note (debounced)
  useEffect(() => {
    if (!note || note.length < 3) return;

    const timeout = setTimeout(async () => {
      // Don't override if they manually picked a category
      if (categoryId) return;
      
      setIsAILoading(true);
      const catNames = categories.map(c => c.name);
      try {
        const suggested = await OfflineAIService.categorizeExpense(note, catNames);
        if (suggested) {
          const matched = categories.find(c => c.name === suggested);
          // Check again just in case they picked one while loading
          if (matched && !categoryId) {
            setCategoryId(matched.id.toString());
            toast.success(`🤖 Auto-categorized as ${matched.name}`);
          }
        }
      } catch (e: any) {
        logError('AI Auto-categorization failed', e?.toString());
      } finally {
        setIsAILoading(false);
      }
    }, 1500); // Wait 1.5s after they stop typing

    return () => clearTimeout(timeout);
  }, [note, categories]);

  const handleCapture = async (source: CameraSource) => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source
      });

      if (photo.webPath) {
        const base64 = await toBase64DataUri(photo.webPath);
        setImageBase64(base64);
        setImagePreview(base64);
      }
    } catch (error: any) {
      logError('Camera error', error?.toString());
      if (error.message !== 'User cancelled photos app') {
        toast.error('Could not access camera/gallery');
      }
    }
  };

  const handleScanReceipt = async () => {
    if (!imageBase64) return;
    setIsScanning(true);
    setScanStatus('Initializing OCR engine...');
    try {
      const result: ReceiptData = await OfflineAIService.extractReceiptData(
        imageBase64,
        (status) => setScanStatus(status)
      );

      // Auto-fill amount
      if (result.amount !== null) {
        setAmount(result.amount.toString());
        toast.success(`Got total: ${result.amount.toFixed(2)}`);
      } else {
        toast.warning('Could not detect total — please enter manually.');
      }

      // Auto-fill note from merchant name
      if (result.merchant) {
        setNote(result.merchant);
        // Bonus: also trigger MobileBERT categorization on merchant name
        if (!categoryId) {
          setIsAILoading(true);
          const catNames = categories.map(c => c.name);
          const suggested = await OfflineAIService.categorizeExpense(result.merchant, catNames);
          if (suggested) {
            const matched = categories.find(c => c.name === suggested);
            if (matched && !categoryId) {
              setCategoryId(matched.id.toString());
              toast.success(`Auto-categorized as ${matched.name}`);
            }
          }
          setIsAILoading(false);
        }
      }
    } catch (err: any) {
      logError('[OCR] error', err?.toString());
      toast.error('Receipt scan failed. Try a clearer photo.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  };

  const handleSubmit = async () => {
    if (!amount || !walletId) {
      toast.error('Please enter amount and select a wallet');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const selectedWallet = wallets.find(w => w.id.toString() === walletId);
    if (selectedWallet && selectedWallet.balance < parsedAmount) {
      toast.error('Insufficient balance in selected wallet');
      return;
    }

    setIsSubmitting(true);

    // Image is already stored as Base64 — no server upload needed
    const tx = {
      user_id: 0,
      wallet_id: Number(walletId),
      category_id: categoryId ? Number(categoryId) : undefined,
      amount: parsedAmount,
      note: note || undefined,
      date,
      image_url: imageBase64 || undefined,
    };
    
    await addTransaction(tx);
    await checkLowBalance(Number(walletId));

    // Background anomaly check — local stats, no API key needed
    const anomaly = OfflineAIService.checkAnomaly(tx, transactions, allowance.amount);
    if (anomaly.isAnomaly) {
      const alertId = Date.now();
      LocalDB.alerts.set({
        id: alertId,
        user_id: 0,
        threshold: 0,
        message: `🚨 Splurge Alert: ${anomaly.message}`,
        triggered_at: new Date().toISOString(),
        dismissed: false
      });
      toast.warning(`🚨 ${anomaly.message}`);

      // Fire a true Android system notification
      try {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'prompt') {
           await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "BaonBuddy Splurge Alert 🚨",
              body: anomaly.message,
              id: alertId,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: undefined,
              attachments: undefined,
              actionTypeId: "",
              extra: null
            }
          ]
        });
      } catch (e: any) {
        logError('Failed to schedule local notification', e?.toString());
      }
    }

    setIsSubmitting(false);
    toast.success('Expense added successfully!');
    onNavigate('dashboard');
  };

  const quickAmounts = [50, 100, 200, 500, 1000];

  return (
    <AIErrorBoundary featureName="Expense Tracking AI">
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h1>
      </motion.div>

      {/* Amount Input */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#6C5CE7] to-[#A463F5]">
          <CardContent className="p-6">
            <Label className="text-white/80 mb-2 block">Amount</Label>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl text-white">₱</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-4xl font-bold bg-transparent border-0 text-white placeholder:text-white/50 focus-visible:ring-0 p-0 h-auto"
              />
            </div>
            {/* Daily budget remaining indicator */}
            {todayBudgetLimit > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex justify-between text-white/70 text-xs mb-1">
                  <span>Today's budget</span>
                  <span className={parseFloat(amount || '0') > todayBudgetRemaining ? 'text-red-300 font-bold' : ''}>
                    {formatCurrency(todayBudgetRemaining)} left
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (parseFloat(amount || '0') / todayBudgetLimit) * 100)}%`,
                      backgroundColor: parseFloat(amount || '0') > todayBudgetRemaining ? '#fca5a5' : '#a5f3fc'
                    }}
                  />
                </div>
                {parseFloat(amount || '0') > todayBudgetRemaining && todayBudgetRemaining >= 0 && (
                  <p className="text-red-300 text-[10px] font-bold mt-1">
                    ⚠️ Exceeds today's budget by {formatCurrency(parseFloat(amount || '0') - todayBudgetRemaining)}. Excess carries to tomorrow.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Amounts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 flex-wrap"
      >
        {quickAmounts.map((amt) => (
          <Button
            key={amt}
            variant="outline"
            size="sm"
            onClick={() => setAmount(amt.toString())}
            className="rounded-full"
          >
            ₱{amt}
          </Button>
        ))}
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Wallet
          </Label>
          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger className="rounded-xl h-12">
              <SelectValue placeholder="Select wallet" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map(w => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name} (₱{w.balance})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex flex-row items-center gap-2">
            <Tag className="w-4 h-4" />
            Category
            {isAILoading && <Loader2 className="w-3 h-3 text-[#6C5CE7] animate-spin ml-1" />}
          </Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="rounded-xl h-12">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  <div className="flex items-center gap-2">
                    <CategoryIcon icon={c.icon} className="w-4 h-4" />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Note (Optional)
          </Label>
          <Input
            placeholder="What was this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl h-12"
          />
        </div>

        {/* Image Upload Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Receipt / Photo (Optional)
          </Label>
          
          {imagePreview ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-3"
            >
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#6C5CE7] shadow-xl group">
                <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/20 border-white text-white hover:bg-white/40 rounded-full"
                    onClick={() => handleCapture(CameraSource.Camera)}
                  >
                    <Camera className="w-4 h-4 mr-2" /> Retake
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setImageBase64(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" /> Remove
                  </Button>
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Saved locally
                </div>
              </div>

              {/* AI Scan Receipt Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleScanReceipt}
                disabled={isScanning}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-bold shadow-lg shadow-violet-500/30 disabled:opacity-60 transition-all"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">{scanStatus || 'Scanning...'}</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-5 h-5" />
                    <span>Scan Receipt with AI</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="h-32 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#2D2D44] border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all group"
                onClick={() => handleCapture(CameraSource.Camera)}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-[#6C5CE7]" />
                </div>
                <div className="text-center px-2">
                  <span className="text-sm font-bold block text-gray-900 dark:text-gray-100">Take Photo</span>
                  <span className="text-[10px] text-gray-500 font-medium">Scan receipt</span>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="h-32 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#2D2D44] border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all group"
                onClick={() => handleCapture(CameraSource.Photos)}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-center px-2">
                  <span className="text-sm font-bold block text-gray-900 dark:text-gray-100">Upload File</span>
                  <span className="text-[10px] text-gray-500 font-medium">Gallery or files</span>
                </div>
              </motion.button>
            </div>
          )}
          
        </div>


        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] text-white font-semibold text-lg shadow-lg shadow-purple-500/25"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Calculator className="w-5 h-5 mr-2" />
              Add Expense
            </>
          )}
        </Button>
      </motion.div>
    </div>
    </AIErrorBoundary>
  );
}

export default AddExpensePage;
