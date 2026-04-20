import React, { createContext, useState, useEffect, useCallback } from 'react';
import bcrypt from 'bcryptjs';
import LocalDB from '@/services/localDB';
import { logError } from '@/utils/errorLog';

const BCRYPT_ROUNDS = 10;
const MAX_PIN_ATTEMPTS = 5;
const MAX_RECOVERY_ATTEMPTS = 5;
const RECOVERY_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function getLockoutDuration(failedAttempts: number): number {
  if (failedAttempts <= 5)  return 30 * 1000;          // 30 seconds
  if (failedAttempts <= 10) return 2 * 60 * 1000;      // 2 minutes
  if (failedAttempts <= 15) return 10 * 60 * 1000;     // 10 minutes
  if (failedAttempts <= 20) return 60 * 60 * 1000;     // 1 hour
  return Infinity;                                     // permanent lock — requires recovery code
}

const COMMON_PINS = ['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','0123','9876','1122','1212'];

interface AuthState {
  isUnlocked: boolean;
  hasMPIN: boolean;
  hasSecurityQuestion: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  setupMPIN: (pin: string) => Promise<{ success: boolean; recoveryCode?: string; error?: string }>;
  verifyMPIN: (pin: string) => Promise<{ success: boolean; error?: string; locked?: boolean; lockSecondsLeft?: number }>;
  verifyRecoveryCode: (code: string) => Promise<{ success: boolean; error?: string; locked?: boolean; lockSecondsLeft?: number }>;
  resetMPIN: (newPin: string, generateNewRecovery?: boolean) => Promise<{ success: boolean; recoveryCode?: string; error?: string }>;
  changeMPIN: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  generateNewRecoveryCode: (currentPin: string) => Promise<{ success: boolean; recoveryCode?: string; error?: string }>;
  setupSecurityQuestion: (currentPin: string, question: string, answer: string) => Promise<{ success: boolean; error?: string }>;
  verifySecurityAnswer: (answer: string) => Promise<{ success: boolean; error?: string; locked?: boolean; lockSecondsLeft?: number }>;
  resetAllData: () => Promise<void>;
  lock: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function secureRandomIndex(max: number): number {
  const arr = new Uint8Array(1);
  let index: number;
  do {
    crypto.getRandomValues(arr);
    index = arr[0];
  } while (index >= Math.floor(256 / max) * max); // rejection sampling for uniform distribution
  return index % max;
}

function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let group = '';
    for (let i = 0; i < 4; i++) {
      group += chars[secureRandomIndex(chars.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

function normalizeRecoveryCode(code: string): string {
  return code.replace(/[-\s]/g, '').toUpperCase().trim();
}

function normalizeSecurityAnswer(answer: string): string {
  return answer.toLowerCase().trim();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isUnlocked: false,
    hasMPIN: false,
    hasSecurityQuestion: false,
    isLoading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const initialized = await LocalDB.auth.isMPINInitialized();
        const mpinHash = await LocalDB.auth.getMPINHash();
        const hasSecurityQuestion = await LocalDB.auth.hasSecurityQuestion();
        setState({
          isUnlocked: false,
          hasMPIN: initialized && !!mpinHash,
          hasSecurityQuestion,
          isLoading: false,
        });
      } catch (error: any) {
        logError('Auth init error', error?.toString());
        setState({
          isUnlocked: false,
          hasMPIN: false,
          hasSecurityQuestion: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  const setupMPIN = useCallback(async (pin: string) => {
    try {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return { success: false, error: 'MPIN must be exactly 4 digits' };
      }
      if (COMMON_PINS.includes(pin)) {
        return { success: false, error: 'This PIN is too common. Please choose a less predictable one.' };
      }

      const mpinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
      
      const recoveryCode = generateRecoveryCode();
      const normalizedCode = normalizeRecoveryCode(recoveryCode);
      const recoveryHash = await bcrypt.hash(normalizedCode, BCRYPT_ROUNDS);

      await LocalDB.auth.setMPINHash(mpinHash);
      await LocalDB.auth.setRecoveryCodeHash(recoveryHash);
      await LocalDB.auth.setFailedAttempts(0);
      await LocalDB.auth.setLockUntil(null);

      await LocalDB.meta.getDeviceId();

      setState(prev => ({
        ...prev,
        isUnlocked: true,
        hasMPIN: true,
        isLoading: false,
      }));

      return { success: true, recoveryCode };
    } catch (error: any) {
      logError('Setup MPIN error', error?.toString());
      return { success: false, error: 'Failed to setup MPIN' };
    }
  }, []);

  const verifyMPIN = useCallback(async (pin: string) => {
    try {
      const lockUntil = await LocalDB.auth.getLockUntil();
      if (lockUntil && Date.now() < lockUntil) {
        const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
        return { success: false, locked: true, lockSecondsLeft: secondsLeft, error: `Too many attempts. Try again in ${secondsLeft} seconds.` };
      }

      if (lockUntil && Date.now() >= lockUntil) {
        await LocalDB.auth.setLockUntil(null);
        await LocalDB.auth.setFailedAttempts(0);
      }

      const mpinHash = await LocalDB.auth.getMPINHash();
      if (!mpinHash) {
        return { success: false, error: 'No MPIN set up' };
      }

      const isValid = await bcrypt.compare(pin, mpinHash);
      
      if (isValid) {
        await LocalDB.auth.setFailedAttempts(0);
        await LocalDB.auth.setLockUntil(null);
        setState(prev => ({ ...prev, isUnlocked: true }));
        return { success: true };
      } else {
        const attempts = await LocalDB.auth.getFailedAttempts();
        const newAttempts = attempts + 1;
        await LocalDB.auth.setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          const lockoutDuration = getLockoutDuration(newAttempts);
          if (lockoutDuration === Infinity) {
            await LocalDB.auth.setLockUntil(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // effectively forever
            return { success: false, locked: true, lockSecondsLeft: Infinity, error: 'Account locked securely. Please use your Recovery Code.' };
          } else {
            const lockTime = Date.now() + lockoutDuration;
            await LocalDB.auth.setLockUntil(lockTime);
            return { success: false, locked: true, lockSecondsLeft: Math.ceil(lockoutDuration / 1000), error: `Locked out for ${Math.ceil(lockoutDuration / 1000 / 60)} minutes.` };
          }
        }

        const remaining = MAX_PIN_ATTEMPTS - (newAttempts % 5);
        return { success: false, error: `Incorrect MPIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} until next lock.` };
      }
    } catch (error: any) {
      logError('Verify MPIN error', error?.toString());
      return { success: false, error: 'Verification failed' };
    }
  }, []);

  const verifyRecoveryCode = useCallback(async (code: string) => {
    try {
      const lockUntil = await LocalDB.auth.getRecoveryLockUntil();
      if (lockUntil && Date.now() < lockUntil) {
        const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
        return { success: false, locked: true, lockSecondsLeft: secondsLeft, error: `Try again in ${Math.ceil(secondsLeft / 60)} minutes.` };
      }

      if (lockUntil && Date.now() >= lockUntil) {
        await LocalDB.auth.setRecoveryLockUntil(null);
        await LocalDB.auth.setRecoveryFailedAttempts(0);
      }

      const recoveryHash = await LocalDB.auth.getRecoveryCodeHash();
      if (!recoveryHash) {
        return { success: false, error: 'No recovery code set up' };
      }

      const normalizedCode = normalizeRecoveryCode(code);
      const isValid = await bcrypt.compare(normalizedCode, recoveryHash);

      if (isValid) {
        await LocalDB.auth.setRecoveryFailedAttempts(0);
        await LocalDB.auth.setRecoveryLockUntil(null);
        return { success: true };
      } else {
        const attempts = await LocalDB.auth.getRecoveryFailedAttempts();
        const newAttempts = attempts + 1;
        await LocalDB.auth.setRecoveryFailedAttempts(newAttempts);

        if (newAttempts >= MAX_RECOVERY_ATTEMPTS) {
          const lockTime = Date.now() + RECOVERY_LOCKOUT_MS;
          await LocalDB.auth.setRecoveryLockUntil(lockTime);
          await LocalDB.auth.setRecoveryFailedAttempts(0);
          return { success: false, locked: true, lockSecondsLeft: Math.ceil(RECOVERY_LOCKOUT_MS / 1000), error: 'Locked for 5 minutes.' };
        }

        const remaining = MAX_RECOVERY_ATTEMPTS - newAttempts;
        return { success: false, error: `Invalid recovery code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
      }
    } catch (error: any) {
      return { success: false, error: 'Recovery verification failed' };
    }
  }, []);

  const resetMPIN = useCallback(async (newPin: string, generateNewRecovery: boolean = true) => {
    try {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return { success: false, error: 'MPIN must be exactly 4 digits' };
      }
      if (COMMON_PINS.includes(newPin)) {
        return { success: false, error: 'This PIN is too common. Please choose a less predictable one.' };
      }

      const mpinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
      await LocalDB.auth.setMPINHash(mpinHash);
      await LocalDB.auth.setFailedAttempts(0);
      await LocalDB.auth.setLockUntil(null);

      let recoveryCode: string | undefined;
      if (generateNewRecovery) {
        recoveryCode = generateRecoveryCode();
        const normalizedCode = normalizeRecoveryCode(recoveryCode);
        const recoveryHash = await bcrypt.hash(normalizedCode, BCRYPT_ROUNDS);
        await LocalDB.auth.setRecoveryCodeHash(recoveryHash);
        await LocalDB.auth.setRecoveryFailedAttempts(0);
        await LocalDB.auth.setRecoveryLockUntil(null);
      }

      setState(prev => ({ ...prev, isUnlocked: true }));
      return { success: true, recoveryCode };
    } catch (error: any) {
      return { success: false, error: 'Failed to reset MPIN' };
    }
  }, []);

  const changeMPIN = useCallback(async (currentPin: string, newPin: string) => {
    try {
      const mpinHash = await LocalDB.auth.getMPINHash();
      if (!mpinHash) {
        return { success: false, error: 'No MPIN set up' };
      }

      const isValid = await bcrypt.compare(currentPin, mpinHash);
      if (!isValid) {
        return { success: false, error: 'Current MPIN is incorrect' };
      }

      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return { success: false, error: 'New MPIN must be exactly 4 digits' };
      }
      if (COMMON_PINS.includes(newPin)) {
        return { success: false, error: 'This PIN is too common. Please choose a less predictable one.' };
      }

      const newHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
      await LocalDB.auth.setMPINHash(newHash);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to change MPIN' };
    }
  }, []);

  const generateNewRecoveryCode = useCallback(async (currentPin: string) => {
    try {
      const mpinHash = await LocalDB.auth.getMPINHash();
      if (!mpinHash) return { success: false, error: 'No MPIN set up' };

      const isValid = await bcrypt.compare(currentPin, mpinHash);
      if (!isValid) return { success: false, error: 'Current MPIN is incorrect' };

      const recoveryCode = generateRecoveryCode();
      const normalizedCode = normalizeRecoveryCode(recoveryCode);
      const recoveryHash = await bcrypt.hash(normalizedCode, BCRYPT_ROUNDS);
      
      await LocalDB.auth.setRecoveryCodeHash(recoveryHash);
      await LocalDB.auth.setRecoveryFailedAttempts(0);
      await LocalDB.auth.setRecoveryLockUntil(null);

      return { success: true, recoveryCode };
    } catch (error: any) {
      return { success: false, error: 'Failed to generate recovery code' };
    }
  }, []);

  const setupSecurityQuestion = useCallback(async (currentPin: string, question: string, answer: string) => {
    try {
      const mpinHash = await LocalDB.auth.getMPINHash();
      if (!mpinHash) return { success: false, error: 'No MPIN set up' };

      const isValid = await bcrypt.compare(currentPin, mpinHash);
      if (!isValid) return { success: false, error: 'Current MPIN is incorrect' };

      if (!question.trim() || !answer.trim()) {
        return { success: false, error: 'Question and answer are required' };
      }

      const normalizedAnswer = normalizeSecurityAnswer(answer);
      const answerHash = await bcrypt.hash(normalizedAnswer, BCRYPT_ROUNDS);

      await LocalDB.auth.setSecurityQuestion(question.trim());
      await LocalDB.auth.setSecurityAnswerHash(answerHash);
      
      setState(prev => ({ ...prev, hasSecurityQuestion: true }));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Failed to setup security question' };
    }
  }, []);

  const verifySecurityAnswer = useCallback(async (answer: string) => {
    try {
      const lockUntil = await LocalDB.auth.getRecoveryLockUntil();
      if (lockUntil && Date.now() < lockUntil) {
        const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
        return { success: false, locked: true, lockSecondsLeft: secondsLeft, error: `Try again in ${Math.ceil(secondsLeft / 60)} minutes.` };
      }

      if (lockUntil && Date.now() >= lockUntil) {
        await LocalDB.auth.setRecoveryLockUntil(null);
        await LocalDB.auth.setRecoveryFailedAttempts(0);
      }

      const answerHash = await LocalDB.auth.getSecurityAnswerHash();
      if (!answerHash) {
        return { success: false, error: 'No security question set up' };
      }

      const normalizedAnswer = normalizeSecurityAnswer(answer);
      const isValid = await bcrypt.compare(normalizedAnswer, answerHash);

      if (isValid) {
        await LocalDB.auth.setRecoveryFailedAttempts(0);
        await LocalDB.auth.setRecoveryLockUntil(null);
        return { success: true };
      } else {
        const attempts = await LocalDB.auth.getRecoveryFailedAttempts();
        const newAttempts = attempts + 1;
        await LocalDB.auth.setRecoveryFailedAttempts(newAttempts);

        if (newAttempts >= MAX_RECOVERY_ATTEMPTS) {
          const lockTime = Date.now() + RECOVERY_LOCKOUT_MS;
          await LocalDB.auth.setRecoveryLockUntil(lockTime);
          await LocalDB.auth.setRecoveryFailedAttempts(0);
          return { success: false, locked: true, lockSecondsLeft: Math.ceil(RECOVERY_LOCKOUT_MS / 1000), error: 'Locked for 5 minutes.' };
        }

        const remaining = MAX_RECOVERY_ATTEMPTS - newAttempts;
        return { success: false, error: `Incorrect answer. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
      }
    } catch (error: any) {
      return { success: false, error: 'Verification failed' };
    }
  }, []);

  const resetAllData = useCallback(async () => {
    await LocalDB.meta.clearAll();
    setState({
      isUnlocked: false,
      hasMPIN: false,
      hasSecurityQuestion: false,
      isLoading: false,
    });
  }, []);

  const lock = useCallback(() => {
    setState(prev => ({ ...prev, isUnlocked: false }));
  }, []);
  const logout = lock;

  return (
    <AuthContext.Provider value={{
      ...state,
      setupMPIN,
      verifyMPIN,
      verifyRecoveryCode,
      resetMPIN,
      changeMPIN,
      generateNewRecoveryCode,
      setupSecurityQuestion,
      verifySecurityAnswer,
      resetAllData,
      lock,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
