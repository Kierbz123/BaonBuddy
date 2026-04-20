import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocalDB from '@/services/localDB';
import AIService from '@/services/ai';
import { Label } from '@/components/ui/label';
import { Wallet, Save, Shield, Lock, Trash2, AlertTriangle, KeyRound, LogOut, HelpCircle, RefreshCw, Cpu, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export function SettingsPage({ onNavigate: _onNavigate }: SettingsPageProps) {
  const { 
    allowance, 
    updateAllowance
  } = useApp();
  const [amount, setAmount] = useState(allowance.amount.toString());
  const [period, setPeriod] = useState(allowance.period);

  const {
    changeMPIN, resetAllData, lock, logout,
    generateNewRecoveryCode, setupSecurityQuestion, hasSecurityQuestion
  } = useAuth();

  // Change MPIN state
  const [showChangeMPIN, setShowChangeMPIN] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Reset data state
  const [showResetModal, setShowResetModal] = useState(false);
  const [showFinalReset, setShowFinalReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Recovery Options State
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [rcCurrentPin, setRcCurrentPin] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);
  const [isGeneratingRC, setIsGeneratingRC] = useState(false);

  const [showSetupSQ, setShowSetupSQ] = useState(false);
  const [sqCurrentPin, setSqCurrentPin] = useState('');
  const [sqPreset, setSqPreset] = useState('');
  const [sqCustom, setSqCustom] = useState('');
  const [sqAnswer, setSqAnswer] = useState('');
  const [isSettingSQ, setIsSettingSQ] = useState(false);

  const PREDEFINED_QUESTIONS = [
    "What was your first pet's name?",
    "In what city were you born?",
    "What is your mother's maiden name?",
    "What high school did you attend?",
    "Custom question..."
  ];

  // AI config state — built-in key is always active as fallback
  const [geminiKey, setGeminiKey] = useState('');
  // true = user has saved their own key; false = using the built-in default
  const [usingCustomKey, setUsingCustomKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    LocalDB.meta.getGeminiKey().then(key => {
      if (key) {
        setGeminiKey(key);
        setUsingCustomKey(true);
      }
    });
  }, []);

  // Logout state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showFinalLogout, setShowFinalLogout] = useState(false);

  useEffect(() => {
    setAmount(allowance.amount.toString());
    setPeriod(allowance.period);
  }, [allowance]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    await updateAllowance({
      amount: numAmount,
      period
    });
    toast.success('Settings saved successfully');
  };

  const handleChangeMPIN = async () => {
    if (currentPin.length !== 4) {
      toast.error('Enter your current 4-digit MPIN');
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('New MPIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error('New PINs do not match');
      return;
    }

    setIsChangingPin(true);
    const result = await changeMPIN(currentPin, newPin);
    setIsChangingPin(false);

    if (result.success) {
      toast.success('MPIN changed successfully!');
      setShowChangeMPIN(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
      toast.error(result.error || 'Failed to change MPIN');
    }
  };

  const handleGenerateRecoveryCode = async () => {
    if (rcCurrentPin.length !== 4) {
      toast.error('Enter your current MPIN first');
      return;
    }
    setIsGeneratingRC(true);
    const result = await generateNewRecoveryCode(rcCurrentPin);
    setIsGeneratingRC(false);

    if (result.success) {
      toast.success('New Recovery Code generated!');
      setNewRecoveryCode(result.recoveryCode!);
      setRcCurrentPin('');
    } else {
      toast.error(result.error || 'Failed to generate code');
    }
  };

  const handleSetupSecurityQuestion = async () => {
    if (sqCurrentPin.length !== 4) {
      toast.error('Enter your current MPIN');
      return;
    }
    
    const question = sqPreset === 'Custom question...' ? sqCustom : sqPreset;
    
    if (!question.trim()) {
      toast.error('Please select or write a question');
      return;
    }
    if (!sqAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    setIsSettingSQ(true);
    const result = await setupSecurityQuestion(sqCurrentPin, question, sqAnswer);
    setIsSettingSQ(false);

    if (result.success) {
      toast.success('Security question configured!');
      setShowSetupSQ(false);
      setSqCurrentPin('');
      setSqAnswer('');
      setSqCustom('');
      setSqPreset('');
    } else {
      toast.error(result.error || 'Failed to setup question');
    }
  };

  const handleSaveAIKey = async () => {
    setIsSavingKey(true);
    await LocalDB.meta.setGeminiKey(geminiKey.trim() || null);
    setIsSavingKey(false);
    setUsingCustomKey(!!geminiKey.trim());

    if (geminiKey.trim()) {
      toast.success('Custom API Key saved! AI features are active.');
    } else {
      toast.success('Custom key cleared — using built-in key.');
    }
  };

  const handleTestAI = async () => {
    setIsTesting(true);
    toast.info('Testing AI connection...');
    const result = await AIService.testConnection();
    setIsTesting(false);
    if (result.ok) {
      toast.success('✅ AI connection successful! Gemini is working.');
    } else {
      toast.error(`❌ AI test failed: ${result.error}`);
    }
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      toast.success('All data has been reset.');
    } catch {
      toast.error('Failed to reset data');
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
      setShowFinalReset(false);
    }
  };

  const handleLock = () => {
    lock();
    toast.success('App locked');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };


  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings ⚙️</h1>

        {/* Allowance Settings Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-3xl p-5 shadow-sm space-y-4 border border-border"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Allowance Settings</h2>
          </div>

          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
                  period === p 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div>
            <p className="text-sm text-muted-foreground font-semibold mb-1">Amount (₱)</p>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              placeholder="0.00"
            />
          </div>

          <Button 
            onClick={handleSave}
            className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </motion.div>

        {/* AI Configuration Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-3xl p-5 shadow-sm space-y-4 border border-border relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-24 h-24" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-foreground">AI Features</h2>
            </div>
            {usingCustomKey ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                <Check className="w-3 h-3" /> Custom Key
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wide">
                <AlertCircle className="w-3 h-3" /> Key Required
              </span>
            )}
          </div>

          {/* Quota warning banner — shown when using the built-in key */}
          {!usingCustomKey && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Free-tier quota exceeded</p>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/70 mt-0.5">
                    The shared built-in key has hit Google's daily limit. Get your own <strong>free</strong> Gemini API key — takes 30 seconds.
                  </p>
                </div>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full justify-center py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Get Free API Key at aistudio.google.com
              </a>
            </motion.div>
          )}

          {usingCustomKey && (
            <p className="text-xs text-muted-foreground relative z-10">
              Uses <strong>gemini-2.0-flash</strong> for Smart Insights, Voice Expenses &amp; Anomaly Alerts.
              <span className="ml-1 text-indigo-400 font-semibold">Your personal API key is active. ✓</span>
            </p>
          )}

          {/* Key input */}
          <div className="relative z-10">
            <Label className="text-xs font-bold ml-1" style={{ color: usingCustomKey ? undefined : 'rgb(234 88 12)' }}>
              {usingCustomKey ? 'Your Gemini API Key' : '➜ Paste Your Free API Key Here'}
            </Label>
            <div className="relative mt-1">
              <Input
                type="text"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className={`w-full bg-secondary rounded-xl px-4 py-3 h-12 text-sm font-mono outline-none text-foreground pr-10 ${
                  !usingCustomKey ? 'border-orange-300 dark:border-orange-700 focus:ring-2 focus:ring-orange-400/30' : 'focus:ring-2 focus:ring-indigo-500/30'
                }`}
              />
              {usingCustomKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleSaveAIKey}
            disabled={isSavingKey || !geminiKey.trim()}
            className={`w-full py-5 h-12 rounded-xl font-bold flex items-center justify-center gap-2 relative z-10 shadow-lg ${
              !usingCustomKey
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/25 text-white'
            }`}
          >
            {isSavingKey ? 'Saving...' : (usingCustomKey ? 'Update API Key' : 'Save API Key & Enable AI')}
          </Button>

          {usingCustomKey && (
            <Button
              onClick={handleTestAI}
              disabled={isTesting}
              variant="outline"
              className="w-full py-5 h-12 rounded-xl border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-bold flex items-center justify-center gap-2 relative z-10"
            >
              {isTesting ? (
                <><Cpu className="w-4 h-4 animate-pulse" /> Testing...</>
              ) : (
                <><Cpu className="w-4 h-4" /> Test AI Connection</>
              )}
            </Button>
          )}
        </motion.div>

        {/* Security Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-3xl p-5 shadow-sm space-y-4 border border-border"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Security</h2>
          </div>

          {/* Lock App */}
          <Button
            onClick={handleLock}
            variant="outline"
            className="w-full py-5 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Lock App
          </Button>

          {/* Change MPIN */}
          <Button
            onClick={() => setShowChangeMPIN(!showChangeMPIN)}
            variant="outline"
            className="w-full py-5 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Change MPIN
          </Button>

          <AnimatePresence>
            {showChangeMPIN && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current MPIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-11 text-center text-lg font-mono tracking-[0.5em] rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">New MPIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-11 text-center text-lg font-mono tracking-[0.5em] rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Confirm New MPIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-11 text-center text-lg font-mono tracking-[0.5em] rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleChangeMPIN}
                  disabled={isChangingPin}
                  className="w-full py-5 rounded-xl bg-primary text-primary-foreground font-bold"
                >
                  {isChangingPin ? 'Changing...' : 'Update MPIN'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recovery Options */}
          <Button
            onClick={() => setShowRecoveryOptions(!showRecoveryOptions)}
            variant="outline"
            className="w-full py-5 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Recovery Options
          </Button>

          <AnimatePresence>
            {showRecoveryOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden pt-2 pl-4 border-l-2 border-border"
              >
                {/* 1. Recovery Code Generation */}
                <div>
                  <Button
                    onClick={() => setShowRecoveryCode(!showRecoveryCode)}
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground mb-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Show/Reset Recovery Code
                  </Button>
                  
                  <AnimatePresence>
                    {showRecoveryCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden ml-2"
                      >
                        {!newRecoveryCode ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-2">
                              For security, generating a new recovery code instantly invalidates the old one. Keep it written down safely.
                            </p>
                            <Input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="Current 4-digit MPIN"
                              value={rcCurrentPin}
                              onChange={(e) => setRcCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              className="h-11 text-center font-mono tracking-[0.2em] rounded-xl"
                            />
                            <Button
                              onClick={handleGenerateRecoveryCode}
                              disabled={isGeneratingRC}
                              className="w-full rounded-xl mt-1"
                              variant="secondary"
                            >
                              {isGeneratingRC ? '...' : 'Generate New Code'}
                            </Button>
                          </>
                        ) : (
                          <div className="bg-secondary p-4 rounded-xl text-center space-y-2">
                            <h4 className="text-sm font-bold text-foreground">Your New Recovery Code</h4>
                            <p className="font-mono text-xl text-primary tracking-widest break-all font-bold">
                              {newRecoveryCode}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Write this down and keep it safe.</p>
                            <Button
                              variant="outline"
                              className="w-full mt-2"
                              size="sm"
                              onClick={() => { setNewRecoveryCode(null); setShowRecoveryCode(false); }}
                            >
                              Done
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Security Question */}
                <div>
                  <Button
                    onClick={() => setShowSetupSQ(!showSetupSQ)}
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground mb-2"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" /> Setup Security Question {hasSecurityQuestion && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
                  </Button>

                  <AnimatePresence>
                    {showSetupSQ && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden ml-2"
                      >
                         <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="Current 4-digit MPIN"
                            value={sqCurrentPin}
                            onChange={(e) => setSqCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="h-11 text-center font-mono tracking-[0.2em] rounded-xl"
                          />
                          <select 
                            value={sqPreset} 
                            onChange={(e) => setSqPreset(e.target.value)}
                            className="w-full bg-secondary rounded-xl px-4 py-2 text-sm text-foreground outline-none border border-border h-11"
                          >
                            <option value="" disabled>Select a question...</option>
                            {PREDEFINED_QUESTIONS.map(q => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>

                          {sqPreset === 'Custom question...' && (
                            <Input
                              type="text"
                              placeholder="Write your custom question..."
                              value={sqCustom}
                              onChange={(e) => setSqCustom(e.target.value)}
                              className="h-11 rounded-xl"
                            />
                          )}

                          <Input
                            type="text"
                            placeholder="Your Answer (e.g. Fluffy)"
                            value={sqAnswer}
                            onChange={(e) => setSqAnswer(e.target.value)}
                            className="h-11 rounded-xl font-medium"
                          />
                          
                          <Button
                            onClick={handleSetupSecurityQuestion}
                            disabled={isSettingSQ}
                            className="w-full rounded-xl mt-1"
                            variant="secondary"
                          >
                            {isSettingSQ ? '...' : (hasSecurityQuestion ? 'Update Question' : 'Save Question')}
                          </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Log Out */}
          <Button
            onClick={() => { setShowLogoutModal(true); setShowFinalLogout(false); }}
            variant="outline"
            className="w-full py-5 rounded-xl border-orange-200 dark:border-orange-900/30 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-3xl p-5 shadow-sm space-y-4 border border-red-200 dark:border-red-900/30"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-foreground">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Reset all data including wallets, transactions, MPIN, and recovery code. This action is permanent and cannot be undone.
          </p>
          <Button
            onClick={() => { setShowResetModal(true); setShowFinalReset(false); }}
            variant="outline"
            className="w-full py-5 rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Reset All Data
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground font-medium">
            BaonBuddy v1.0 • Made with 💜 • 100% Offline
          </p>
        </div>
      </div>

      {/* ==================== LOGOUT DOUBLE CONFIRMATION MODAL ==================== */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowLogoutModal(false); setShowFinalLogout(false); }}
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border space-y-4"
            >
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                  <LogOut className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!showFinalLogout ? (
                  <motion.div
                    key="logout-step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground">Log Out?</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your data will be safely kept. You'll need your MPIN to unlock the app again.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => { setShowLogoutModal(false); setShowFinalLogout(false); }}
                        className="flex-1 py-5 rounded-xl font-semibold"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setShowFinalLogout(true)}
                        className="flex-1 py-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                      >
                        Yes, Log Out
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="logout-step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground">Confirm Log Out</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        You will be returned to the MPIN unlock screen. Your wallets and data are safe.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => { setShowLogoutModal(false); setShowFinalLogout(false); }}
                        className="flex-1 py-5 rounded-xl font-semibold"
                      >
                        Go Back
                      </Button>
                      <Button
                        onClick={handleLogout}
                        className="flex-1 py-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                      >
                        Confirm
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== RESET DATA DOUBLE CONFIRMATION MODAL ==================== */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowResetModal(false); setShowFinalReset(false); }}
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border space-y-4"
            >
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!showFinalReset ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground">Reset All Data?</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        This will delete ALL your wallets, transactions, categories, alerts, and MPIN. You will need to set up a new MPIN.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => { setShowResetModal(false); setShowFinalReset(false); }}
                        className="flex-1 py-5 rounded-xl font-semibold"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setShowFinalReset(true)}
                        className="flex-1 py-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold"
                      >
                        Yes, Reset
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground">⚠️ Final Confirmation</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        This CANNOT be undone. All data will be permanently deleted.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => { setShowResetModal(false); setShowFinalReset(false); }}
                        className="flex-1 py-5 rounded-xl font-semibold"
                      >
                        Go Back
                      </Button>
                      <Button
                        onClick={handleResetAllData}
                        disabled={isResetting}
                        className="flex-1 py-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        {isResetting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                        ) : (
                          'Confirm Reset'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SettingsPage;
