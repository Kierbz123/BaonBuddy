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
  X
} from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AIService from '@/services/ai';
import LocalDB from '@/services/localDB';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

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
  const { wallets, categories, transactions, allowance, addTransaction, checkLowBalance } = useApp();
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const cachedVoiceRaw = localStorage.getItem('voicememo_extracted');
    if (cachedVoiceRaw && categories.length > 0) {
      try {
        const voiceData = JSON.parse(cachedVoiceRaw);
        if (voiceData.amount) setAmount(voiceData.amount.toString());
        if (voiceData.description) setNote(voiceData.description);
        
        const matchedCat = categories.find(c => c.name.toLowerCase() === (voiceData.category || '').toLowerCase());
        if (matchedCat) setCategoryId(matchedCat.id.toString());
        
        toast.info('Voice details filled! Please review before saving.');
        localStorage.removeItem('voicememo_extracted');
      } catch (e) {
        console.error("Failed parsing voice memo", e);
      }
    }
  }, [categories]);

  const handleCapture = async (source: CameraSource) => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source
      });

      if (photo.webPath) {
        // Convert to Base64 for offline/local storage — no server needed
        const base64 = await toBase64DataUri(photo.webPath);
        setImageBase64(base64);
        setImagePreview(base64);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      if (error.message !== 'User cancelled photos app') {
        toast.error('Could not access camera/gallery');
      }
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
      wallet_id: parseInt(walletId),
      category_id: categoryId ? parseInt(categoryId) : undefined,
      amount: parsedAmount,
      note: note || undefined,
      date,
      image_url: imageBase64 || undefined,
    };
    
    await addTransaction(tx);
    await checkLowBalance(parseInt(walletId));

    // Optional background anomaly check
    if (await AIService.hasApiKey()) {
      AIService.checkAnomaly(tx, transactions, allowance.amount).then(result => {
        if (result.isAnomaly) {
           LocalDB.alerts.set({
             id: Date.now(),
             user_id: 0,
             threshold: 0,
             message: `AI Splurge Warning: ${result.message}`,
             triggered_at: new Date().toISOString(),
             dismissed: false
           });
           toast.warning(`AI Alert: ${result.message}`);
        }
      });
    }

    setIsSubmitting(false);
    toast.success('Expense added successfully!');
    onNavigate('dashboard');
  };

  const quickAmounts = [50, 100, 200, 500, 1000];

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
          <Label className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Category
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
              className="relative rounded-2xl overflow-hidden border-2 border-[#6C5CE7] shadow-xl group"
            >
              <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white text-white hover:bg-white/40 rounded-full"
                  onClick={() => document.getElementById('camera-input')?.click()}
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
                Saved locally ✓
              </div>
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
  );
}

export default AddExpensePage;
