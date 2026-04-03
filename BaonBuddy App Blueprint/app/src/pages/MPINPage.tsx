import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocalDB from '@/services/localDB';
import { Wallet, ShieldCheck, KeyRound, Copy, AlertTriangle, ArrowLeft, Loader2, Lock, RefreshCw, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

type MPINMode = 'setup' | 'setup-confirm' | 'show-recovery' | 'unlock' | 'forgot' | 'reset-pin' | 'reset-recovery';

export function MPINPage() {
  const { hasMPIN, hasSecurityQuestion, setupMPIN, verifyMPIN, verifyRecoveryCode, verifySecurityAnswer, resetMPIN } = useAuth();
  
  const [mode, setMode] = useState<MPINMode>(hasMPIN ? 'unlock' : 'setup');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  const [forgotMethod, setForgotMethod] = useState<'code' | 'question'>('code');
  const [securityQuestionText, setSecurityQuestionText] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'forgot' && hasSecurityQuestion) {
      LocalDB.auth.getSecurityQuestion().then(q => setSecurityQuestionText(q));
    }
  }, [mode, hasSecurityQuestion]);

  useEffect(() => {
    setMode(hasMPIN ? 'unlock' : 'setup');
  }, [hasMPIN]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockSeconds > 0) {
      const timer = setInterval(() => {
        setLockSeconds(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockSeconds]);
  
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleDigitPress = useCallback((digit: string) => {
    if (isLocked || isProcessing) return;
    
    if (mode === 'setup') {
      if (pin.length < 4) {
        setPin(prev => prev + digit);
        setError('');
      }
    } else if (mode === 'setup-confirm') {
      if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + digit);
        setError('');
      }
    } else if (mode === 'unlock' || mode === 'reset-pin') {
      if (pin.length < 4) {
        setPin(prev => prev + digit);
        setError('');
      }
    }
  }, [mode, pin, confirmPin, isLocked, isProcessing]);

  const handleBackspace = useCallback(() => {
    if (isLocked || isProcessing) return;
    
    if (mode === 'setup') {
      setPin(prev => prev.slice(0, -1));
    } else if (mode === 'setup-confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else if (mode === 'unlock' || mode === 'reset-pin') {
      setPin(prev => prev.slice(0, -1));
    }
  }, [mode, isLocked, isProcessing]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (mode === 'setup' && pin.length === 4) {
      setMode('setup-confirm');
      setConfirmPin('');
    }
  }, [pin, mode]);

  useEffect(() => {
    if (mode === 'setup-confirm' && confirmPin.length === 4) {
      handleSetupSubmit();
    }
  }, [confirmPin, mode]);

  useEffect(() => {
    if (mode === 'unlock' && pin.length === 4) {
      handleUnlock();
    }
  }, [pin, mode]);

  useEffect(() => {
    if (mode === 'reset-pin' && pin.length === 4) {
      // Wait for confirm
    }
  }, [pin, mode]);

  const handleSetupSubmit = async () => {
    if (pin !== confirmPin) {
      setError('PINs do not match. Try again.');
      triggerShake();
      setConfirmPin('');
      return;
    }

    setIsProcessing(true);
    const result = await setupMPIN(pin);
    setIsProcessing(false);

    if (result.success && result.recoveryCode) {
      setRecoveryCode(result.recoveryCode);
      setMode('show-recovery');
    } else {
      setError(result.error || 'Setup failed');
      triggerShake();
    }
  };

  const handleUnlock = async () => {
    setIsProcessing(true);
    const result = await verifyMPIN(pin);
    setIsProcessing(false);

    if (result.success) {
      // Success — the useAuth hook sets isUnlocked = true
    } else {
      triggerShake();
      setPin('');
      setError(result.error || 'Incorrect MPIN');
      if (result.locked) {
        setIsLocked(true);
        setLockSeconds(result.lockSecondsLeft || 30);
      }
    }
  };

  const handleForgotSubmit = async () => {
    setIsProcessing(true);
    let result;

    if (forgotMethod === 'code') {
      if (!recoveryInput.trim()) {
        setError('Please enter your recovery code');
        setIsProcessing(false);
        return;
      }
      result = await verifyRecoveryCode(recoveryInput);
    } else {
      if (!securityAnswerInput.trim()) {
        setError('Please enter your answer');
        setIsProcessing(false);
        return;
      }
      result = await verifySecurityAnswer(securityAnswerInput);
    }

    setIsProcessing(false);

    if (result.success) {
      setMode('reset-pin');
      setPin('');
      setConfirmPin('');
      setError('');
      toast.success(forgotMethod === 'code' ? 'Recovery code verified!' : 'Security answer verified! Set your new MPIN.');
    } else {
      setError(result.error || 'Verification failed');
      triggerShake();
      if (result.locked) {
        setIsLocked(true);
        setLockSeconds(result.lockSecondsLeft || 300);
      }
    }
  };

  const handleResetPinSubmit = async () => {
    if (pin.length !== 4) {
      setError('Enter a 4-digit MPIN');
      return;
    }

    setIsProcessing(true);
    const result = await resetMPIN(pin, true);
    setIsProcessing(false);

    if (result.success && result.recoveryCode) {
      setRecoveryCode(result.recoveryCode);
      setMode('reset-recovery');
      toast.success('MPIN reset successfully!');
    } else {
      setError(result.error || 'Reset failed');
      triggerShake();
    }
  };

  const handleCopyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      toast.success('Recovery code copied!');
    } catch {
      toast.error('Copy failed. Please write it down.');
    }
  };

  const renderDots = (value: string, count: number = 4) => (
    <div className="flex gap-4 justify-center my-8">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i < value.length ? 1.2 : 1,
            backgroundColor: i < value.length ? '#6C5CE7' : 'transparent',
          }}
          className={`w-5 h-5 rounded-full border-2 ${
            i < value.length 
              ? 'border-[#6C5CE7] bg-[#6C5CE7]' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        />
      ))}
    </div>
  );

  const renderNumpad = () => (
    <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <motion.button
          key={digit}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleDigitPress(digit.toString())}
          disabled={isLocked || isProcessing}
          className="w-20 h-16 rounded-2xl text-2xl font-bold bg-white dark:bg-[#2D2D44] shadow-md hover:shadow-lg active:shadow-sm transition-all text-gray-900 dark:text-white disabled:opacity-50 border border-gray-100 dark:border-gray-700"
        >
          {digit}
        </motion.button>
      ))}
      <div /> {/* empty space */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => handleDigitPress('0')}
        disabled={isLocked || isProcessing}
        className="w-20 h-16 rounded-2xl text-2xl font-bold bg-white dark:bg-[#2D2D44] shadow-md hover:shadow-lg active:shadow-sm transition-all text-gray-900 dark:text-white disabled:opacity-50 border border-gray-100 dark:border-gray-700"
      >
        0
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleBackspace}
        disabled={isLocked || isProcessing}
        className="w-20 h-16 rounded-2xl text-lg font-bold bg-gray-100 dark:bg-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all text-gray-500 dark:text-gray-400 disabled:opacity-50"
      >
        ⌫
      </motion.button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#F9F9F9] to-[#F0F0F8] dark:from-[#1E1E2F] dark:to-[#161625]">
      <AnimatePresence mode="wait">
        {/* =========== SETUP MODE =========== */}
        {mode === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#A463F5] flex items-center justify-center mb-6 shadow-lg"
            >
              <Wallet className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] bg-clip-text text-transparent mb-2">
              Welcome to BaonBuddy
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-2">Create your 4-digit MPIN</p>
            
            <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              {renderDots(pin)}
            </motion.div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {renderNumpad()}
          </motion.div>
        )}

        {/* =========== CONFIRM SETUP =========== */}
        {mode === 'setup-confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00B894] to-[#00CEC9] flex items-center justify-center mb-6 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm Your MPIN</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">Re-enter your 4-digit MPIN</p>

            <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              {renderDots(confirmPin)}
            </motion.div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {isProcessing && <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-[#6C5CE7]" />}
            {renderNumpad()}

            <button
              onClick={() => { setMode('setup'); setPin(''); setConfirmPin(''); setError(''); }}
              className="mt-6 text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Start over
            </button>
          </motion.div>
        )}

        {/* =========== SHOW RECOVERY CODE =========== */}
        {(mode === 'show-recovery' || mode === 'reset-recovery') && (
          <motion.div
            key="recovery"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-white dark:bg-[#2D2D44] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Recovery Code</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Save this code — you'll need it to reset your MPIN</p>
              </div>

              {/* Recovery Code Display */}
              <div className="bg-gradient-to-r from-[#6C5CE7]/10 to-[#A463F5]/10 rounded-2xl p-5 mb-4 border-2 border-dashed border-[#6C5CE7]/30">
                <p className="text-center text-3xl font-mono font-bold tracking-[0.3em] text-[#6C5CE7]">
                  {recoveryCode}
                </p>
              </div>

              <Button
                onClick={handleCopyRecovery}
                variant="outline"
                className="w-full mb-4 rounded-xl h-11 border-[#6C5CE7]/30 text-[#6C5CE7] hover:bg-[#6C5CE7]/10"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Recovery Code
              </Button>

              {/* Warning */}
              <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 mb-4 border border-red-200 dark:border-red-900/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700 dark:text-red-400">
                    <p className="font-bold mb-1">⚠️ This code will NOT be shown again!</p>
                    <p>Screenshot or write it down now. Without this code, you cannot recover your account if you forget your MPIN.</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={savedConfirmed}
                  onChange={(e) => setSavedConfirmed(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#6C5CE7]"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  I have saved my recovery code
                </span>
              </label>

              <Button
                onClick={() => {
                  setPin('');
                  setConfirmPin('');
                  setRecoveryCode('');
                  setSavedConfirmed(false);
                  // Auth state is already set to unlocked by setupMPIN/resetMPIN
                }}
                disabled={!savedConfirmed}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] text-white font-bold text-lg shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                Continue to BaonBuddy
              </Button>
            </div>
          </motion.div>
        )}

        {/* =========== UNLOCK MODE =========== */}
        {mode === 'unlock' && (
          <motion.div
            key="unlock"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#A463F5] flex items-center justify-center mb-6 shadow-lg"
            >
              {isLocked ? (
                <Lock className="w-10 h-10 text-white" />
              ) : (
                <Wallet className="w-10 h-10 text-white" />
              )}
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6C5CE7] to-[#A463F5] bg-clip-text text-transparent mb-2">
              BaonBuddy
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {isLocked ? `Locked — try again in ${lockSeconds}s` : 'Enter your MPIN to unlock'}
            </p>

            <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              {renderDots(pin)}
            </motion.div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mb-4"
              >
                {error}
              </motion.p>
            )}
            {isProcessing && <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-[#6C5CE7]" />}
            {renderNumpad()}

            <button
              onClick={() => { setMode('forgot'); setRecoveryInput(''); setError(''); setPin(''); }}
              className="mt-6 text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors"
            >
              Forgot MPIN?
            </button>
          </motion.div>
        )}

        {mode === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-white dark:bg-[#2D2D44] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                  {forgotMethod === 'code' ? <RefreshCw className="w-8 h-8 text-white" /> : <HelpCircle className="w-8 h-8 text-white" />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset MPIN</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Provide verification to reset your MPIN</p>
              </div>

              {hasSecurityQuestion && (
                <div className="flex gap-2 mb-6">
                  <Button
                    variant={forgotMethod === 'code' ? 'default' : 'outline'}
                    onClick={() => { setForgotMethod('code'); setError(''); }}
                    className="flex-1 rounded-xl text-xs sm:text-sm shadow-sm"
                  >
                    Recovery Code
                  </Button>
                  <Button
                    variant={forgotMethod === 'question' ? 'default' : 'outline'}
                    onClick={() => { setForgotMethod('question'); setError(''); }}
                    className="flex-1 rounded-xl text-xs sm:text-sm shadow-sm"
                  >
                    Security Question
                  </Button>
                </div>
              )}

              <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
                {forgotMethod === 'code' ? (
                  <Input
                    placeholder="XXXX-XXXX-XXXX"
                    value={recoveryInput}
                    onChange={(e) => { setRecoveryInput(e.target.value.toUpperCase()); setError(''); }}
                    className="h-14 text-center text-xl font-mono font-bold tracking-widest rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 mb-4"
                    maxLength={14}
                    disabled={isLocked}
                  />
                ) : (
                  <div className="space-y-4 mb-4">
                    <div className="bg-secondary p-4 rounded-xl text-center">
                      <p className="text-sm text-muted-foreground font-semibold">Please answer your security question:</p>
                      <p className="font-bold text-foreground mt-1 text-lg">{securityQuestionText || "Loading..."}</p>
                    </div>
                    <Input
                      placeholder="Your Answer"
                      type="text"
                      value={securityAnswerInput}
                      onChange={(e) => { setSecurityAnswerInput(e.target.value); setError(''); }}
                      className="h-14 text-center rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 font-medium text-lg"
                      disabled={isLocked}
                      autoCapitalize="words"
                    />
                  </div>
                )}
              </motion.div>

              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

              <Button
                onClick={handleForgotSubmit}
                disabled={isProcessing || isLocked || (forgotMethod === 'code' ? !recoveryInput.trim() : !securityAnswerInput.trim())}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg disabled:opacity-50 mb-3"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
              </Button>

              <button
                onClick={() => { setMode('unlock'); setPin(''); setError(''); }}
                className="w-full text-center text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to MPIN
              </button>
            </div>
          </motion.div>
        )}

        {/* =========== RESET PIN MODE (after recovery verified) =========== */}
        {mode === 'reset-pin' && (
          <motion.div
            key="reset-pin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00B894] to-[#00CEC9] flex items-center justify-center mb-6 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New MPIN</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">Enter your new 4-digit MPIN</p>

            <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
              {renderDots(pin)}
            </motion.div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {renderNumpad()}

            <Button
              onClick={handleResetPinSubmit}
              disabled={pin.length !== 4 || isProcessing}
              className="mt-6 w-full max-w-[280px] h-12 rounded-xl bg-gradient-to-r from-[#00B894] to-[#00CEC9] text-white font-bold shadow-lg disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set New MPIN'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MPINPage;
