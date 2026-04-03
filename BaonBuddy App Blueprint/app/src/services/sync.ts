import LocalDB from './localDB';
import { SyncAPI } from './api';

export class SyncService {
  private deviceId: string;
  private onSyncStart?: () => void;
  private onSyncComplete?: () => void;
  private onSyncError?: (error: Error) => void;

  constructor(
    deviceId: string,
    callbacks?: {
      onSyncStart?: () => void;
      onSyncComplete?: () => void;
      onSyncError?: (error: Error) => void;
    }
  ) {
    this.deviceId = deviceId;
    this.onSyncStart = callbacks?.onSyncStart;
    this.onSyncComplete = callbacks?.onSyncComplete;
    this.onSyncError = callbacks?.onSyncError;
  }

  async sync(): Promise<boolean> {
    try {
      this.onSyncStart?.();
      
      const lastSync = await LocalDB.meta.getLastSync();
      const unsyncedTransactions = await LocalDB.transactions.getUnsynced();
      
      if (unsyncedTransactions.length > 0) {
        const transactionsToPush = unsyncedTransactions.map(t => ({
          wallet_id: t.wallet_id,
          category_id: t.category_id,
          amount: t.amount,
          note: t.note,
          date: t.date,
        }));
        
        const pushResult = await SyncAPI.push(
          this.deviceId, 
          transactionsToPush, 
          lastSync || new Date(0).toISOString()
        );
        
        for (const syncedTx of pushResult.transactions) {
          const localTx = unsyncedTransactions.find(t => 
            t.amount === syncedTx.amount && 
            t.date === syncedTx.date && 
            t.wallet_id === syncedTx.wallet_id
          );
          if (localTx) {
            await LocalDB.transactions.remove(localTx.id);
            await LocalDB.transactions.set({ ...syncedTx, synced: true });
          }
        }
      }
      
      const pullResult = await SyncAPI.pull(
        this.deviceId, 
        lastSync || new Date(0).toISOString()
      );
      
      for (const transaction of pullResult.transactions) {
        await LocalDB.transactions.set({ ...transaction, synced: true });
      }
      
      await LocalDB.meta.setLastSync(new Date().toISOString());
      
      this.onSyncComplete?.();
      return true;
    } catch (error) {
      this.onSyncError?.(error as Error);
      return false;
    }
  }

  async fullSync(): Promise<boolean> {
    try {
      this.onSyncStart?.();
      await this.sync();
      this.onSyncComplete?.();
      return true;
    } catch (error) {
      this.onSyncError?.(error as Error);
      return false;
    }
  }
}

export default SyncService;
