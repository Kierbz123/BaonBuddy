import localforage from 'localforage';

const errorStore = localforage.createInstance({ name: 'BaonBuddy', storeName: 'errors' });

export async function logError(message: string, context?: string): Promise<void> {
  const entry = { message, context, timestamp: new Date().toISOString() };
  try {
    const existing: typeof entry[] = (await errorStore.getItem('log')) ?? [];
    const updated = [...existing.slice(-19), entry];
    await errorStore.setItem('log', updated);
    
    // Fallback to console string for dev inspection so we don't completely lose them
    console.warn(`[LoggedError] ${message}`, context);
  } catch { /* silent fail — logging must never crash the app */ }
}

export async function getErrorLog(): Promise<{ message: string; context?: string; timestamp: string }[]> {
  return (await errorStore.getItem('log')) ?? [];
}
